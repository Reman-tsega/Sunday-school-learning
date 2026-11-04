/**
 * Where the student was last studying, so the curriculum page can reopen that grade and subject and
 * scroll to the chapter instead of starting with every grade collapsed. Kept for the browser session.
 */
export interface ChapterPosition {
  gradeLevel: number;
  subjectId: string;
  chapterId: string;
}

const KEY = 'eotc_last_chapter';

export function rememberChapter(position: ChapterPosition): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(position));
  } catch {}
}

/** The chapter to return to: from the link (?grade=&subject=&chapter=) or the last one opened. */
export function chapterToReturnTo(): ChapterPosition | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const grade = Number(params.get('grade'));
    const subjectId = params.get('subject');
    const chapterId = params.get('chapter');
    if (Number.isFinite(grade) && grade > 0 && subjectId && chapterId) {
      return { gradeLevel: grade, subjectId, chapterId };
    }
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (saved && typeof saved.gradeLevel === 'number' && saved.subjectId && saved.chapterId) return saved;
  } catch {}
  return null;
}

/** The curriculum link that reopens a chapter's place in the list. */
export function curriculumHref(position: ChapterPosition | null): string {
  if (!position) return '/';
  const q = new URLSearchParams({ grade: String(position.gradeLevel), subject: position.subjectId, chapter: position.chapterId });
  return `/?${q.toString()}`;
}
