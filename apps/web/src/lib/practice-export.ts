import type { PracticeQuestionDto } from '@eotc/shared';

export interface PracticeExportOptions {
  questions: PracticeQuestionDto[];
  heading: string;
  subheading?: string | undefined;
  includeAnswers: boolean;
  lang: 'am' | 'en';
}

const escapeHtml = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const T = {
  title: { en: 'Practice Questions', am: 'የልምምድ ጥያቄዎች' },
  answer: { en: 'Answer', am: 'መልስ' },
  explanation: { en: 'Explanation', am: 'ማብራሪያ' },
  open: { en: 'Open reflection question — no single correct answer.', am: 'ክፍት የማሰላሰያ ጥያቄ — አንድ የተወሰነ መልስ የለውም።' },
  name: { en: 'Name', am: 'ስም' },
  date: { en: 'Date', am: 'ቀን' },
  generated: { en: 'Generated from the EOTC Sunday School Platform', am: 'ከኢኦተቤ ሰንበት ትምህርት ቤት መድረክ የተዘጋጀ' },
};

function buildDocument({ questions, heading, subheading, includeAnswers, lang }: PracticeExportOptions): string {
  const t = (k: keyof typeof T) => T[k][lang];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const body = questions
    .map((q, i) => {
      const correct = (q.choices ?? []).filter((c) => c.isCorrect);
      let answerBlock = '';

      let options = '';
      if (q.choices && q.choices.length > 0) {
        options =
          '<ol class="choices">' +
          q.choices
            .map(
              (c, ci) =>
                `<li class="${includeAnswers && c.isCorrect ? 'correct' : ''}"><span class="letter">${letters[ci] ?? ci + 1}.</span> ${escapeHtml(c.text)}${
                  includeAnswers && c.isCorrect ? ' <span class="tick">✓</span>' : ''
                }</li>`
            )
            .join('') +
          '</ol>';
      } else if (q.questionType === 'SHORT_ANSWER') {
        options = '<div class="lines"><div></div><div></div></div>';
      }

      if (includeAnswers) {
        const answer = q.answerText || correct.map((c) => c.text).join(' | ');
        answerBlock =
          '<div class="answer">' +
          (answer
            ? `<strong>${t('answer')}:</strong> ${escapeHtml(answer)}`
            : `<em>${t('open')}</em>`) +
          (q.explanation ? `<div class="expl"><strong>${t('explanation')}:</strong> ${escapeHtml(q.explanation)}</div>` : '') +
          '</div>';
      }

      return `<section class="q"><div class="prompt"><span class="num">${i + 1}.</span> ${escapeHtml(q.prompt)}</div>${options}${answerBlock}</section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(heading)} — ${t('title')}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Noto Sans Ethiopic', 'Nyala', 'Abyssinica SIL', 'Segoe UI', system-ui, Arial, sans-serif; color: #111; font-size: 12pt; line-height: 1.5; margin: 0; }
  header { border-bottom: 2px solid #b45309; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 18pt; margin: 0 0 2px; }
  .sub { color: #555; font-size: 10.5pt; }
  .meta { display: flex; gap: 24px; margin-top: 10px; font-size: 10.5pt; color: #333; }
  .meta span { flex: 1; border-bottom: 1px solid #999; padding-bottom: 2px; }
  .q { break-inside: avoid; page-break-inside: avoid; margin: 0 0 16px; }
  .prompt { font-weight: 600; }
  .num { color: #b45309; margin-right: 2px; }
  .choices { list-style: none; margin: 6px 0 0 18px; padding: 0; }
  .choices li { margin: 3px 0; }
  .letter { display: inline-block; width: 1.4em; color: #555; }
  .choices li.correct { font-weight: 700; }
  .tick { color: #047857; font-weight: 700; }
  .lines { margin: 8px 0 0 18px; }
  .lines div { border-bottom: 1px solid #aaa; height: 22px; }
  .answer { margin: 8px 0 0 18px; padding: 6px 10px; border-left: 3px solid #047857; background: #ecfdf5; font-size: 11pt; }
  .expl { margin-top: 4px; color: #065f46; }
  footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #ccc; font-size: 9pt; color: #777; text-align: center; }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(heading)}</h1>
    ${subheading ? `<div class="sub">${escapeHtml(subheading)}</div>` : ''}
    <div class="meta"><span>${t('name')}:</span><span>${t('date')}:</span></div>
  </header>
  ${body}
  <footer>${t('generated')} · ${new Date().toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-GB')}</footer>
</body>
</html>`;
}

/**
 * Opens the browser print dialog for a print-friendly sheet of the questions
 * (choose "Save as PDF" to export). Works offline and renders Amharic with system fonts.
 */
export function printPracticeQuestions(options: PracticeExportOptions): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(buildDocument(options));
  doc.close();

  // Give fonts/layout a moment, then print
  setTimeout(() => {
    win.focus();
    win.addEventListener('afterprint', cleanup);
    win.print();
    setTimeout(cleanup, 60000);
  }, 250);
}
