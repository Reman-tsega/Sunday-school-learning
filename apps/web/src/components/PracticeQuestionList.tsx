'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
  Check,
  Printer,
  RotateCcw,
  PartyPopper,
  Send,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { QuestionTypeFilter, type QuestionTypeFilterValue } from '@/components/QuestionTypeFilter';
import { buildDocument, printPracticeQuestions, type PracticeExportOptions } from '@/lib/practice-export';
import { useTelegram } from '@/lib/telegram-context';
import { sendFileToTelegramChat } from '@/lib/telegram-files';
import { api } from '@/lib/api';
import { haptic } from '@/lib/telegram';
import type { PracticeQuestionDto } from '@eotc/shared';

interface PracticeQuestionListProps {
  chapterId: string;
  questions: PracticeQuestionDto[];
  loading?: boolean;
  /** Title printed on the exported sheet, e.g. the chapter name */
  exportHeading?: string;
  exportSubheading?: string;
}

/**
 * The correct True/False key. Older questions store it in answerText ("TRUE"/"FALSE");
 * questions created in the admin and teacher forms mark the "True"/"False" choice instead.
 */
function trueFalseKey(q: PracticeQuestionDto): 'TRUE' | 'FALSE' | null {
  const fromText = q.answerText?.trim().toUpperCase();
  if (fromText === 'TRUE' || fromText === 'FALSE') return fromText;
  const correct = q.choices?.find((c) => c.isCorrect);
  if (!correct) return null;
  const label = correct.text.trim().toUpperCase();
  if (label === 'TRUE' || label === 'FALSE') return label;
  return correct.orderIndex === 1 ? 'TRUE' : 'FALSE';
}

const CONFETTI_COLORS = ['#f59e0b', '#10b981', '#0C2340', '#f43f5e', '#C59B27', '#38bdf8'];

/** A short burst of confetti from the middle of the correct answer. */
function ConfettiBurst() {
  return (
    <span aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const distance = 46 + (i % 3) * 18;
        const style = {
          '--dx': `${Math.round(Math.cos(angle) * distance * 1.6)}px`,
          '--dy': `${Math.round(Math.sin(angle) * distance)}px`,
          '--rot': `${(i % 2 ? 1 : -1) * (180 + i * 25)}deg`,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animationDelay: `${(i % 4) * 25}ms`,
        } as React.CSSProperties;
        return <span key={i} className="eotc-confetti-piece" style={style} />;
      })}
    </span>
  );
}

export function PracticeQuestionList({
  questions,
  loading = false,
  exportHeading,
  exportSubheading,
}: PracticeQuestionListProps) {
  const { lang } = useLanguage();
  const { isTelegram } = useTelegram();
  const [sendingExport, setSendingExport] = useState(false);
  // The first pick on a multiple-choice or true/false question locks it until "Try again"
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [bursts, setBursts] = useState<Record<string, number>>({});
  const [typeFilter, setTypeFilter] = useState<QuestionTypeFilterValue>('ALL');
  const [exportWithAnswers, setExportWithAnswers] = useState(true);
  const visibleQuestions =
    typeFilter === 'ALL' ? questions : questions.filter((q) => q.questionType === typeFilter);

  const correctKeyOf = (q: PracticeQuestionDto): string | null =>
    q.questionType === 'TRUE_FALSE' ? trueFalseKey(q) : q.choices?.find((c) => c.isCorrect)?.id ?? null;

  const answered = questions.filter((q) => q.questionType !== 'SHORT_ANSWER' && selectedChoices[q.id]);
  const correctCount = answered.filter((q) => selectedChoices[q.id] === correctKeyOf(q)).length;

  const toggleRevealAnswer = (questionId: string) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleSelectChoice = (q: PracticeQuestionDto, key: string) => {
    if (selectedChoices[q.id]) return;
    setSelectedChoices((prev) => ({ ...prev, [q.id]: key }));
    const correctKey = correctKeyOf(q);
    if (!correctKey) return;
    if (key === correctKey) {
      haptic('success');
      setBursts((prev) => ({ ...prev, [q.id]: Date.now() }));
    } else {
      haptic('error');
    }
  };

  const tryAgain = (questionId: string) => {
    setSelectedChoices(({ [questionId]: _, ...rest }) => rest);
    setRevealedAnswers(({ [questionId]: _, ...rest }) => rest);
    setBursts(({ [questionId]: _, ...rest }) => rest);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-stone-200 dark:border-slate-800 text-center text-stone-500 dark:text-slate-400 space-y-2">
        <div className="w-8 h-8 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">
          {lang === 'am' ? 'የልምምድ ጥያቄዎችን በማዘጋጀት ላይ...' : 'Loading practice questions...'}
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-stone-200 dark:border-slate-800 text-center text-stone-500 dark:text-slate-400 space-y-3">
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-stone-800 dark:text-white text-sm sm:text-base">
          {lang === 'am' ? 'ምንም የልምምድ ጥያቄ አልተካተተም' : 'No Practice Questions Available'}
        </h4>
        <p className="text-xs text-stone-500 dark:text-slate-400 max-w-sm mx-auto">
          {lang === 'am'
            ? 'ለዚህ ምዕራፍ የተዘጋጀ የራስ-መገምገሚያ የልምምድ ጥያቄ እስካሁን የለም። መጽሐፉን በማንበብ ወይም ዋናውን ፈተና በመውሰድ ማጥናት ይችላሉ።'
            : 'No formative practice questions have been published for this chapter yet. You can study the textbook or take the graded quiz.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Informative Guidance Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start space-x-3 text-xs text-amber-950 dark:text-amber-200">
        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold">
            {lang === 'am' ? 'የራስ-ዕውቀት መገምገሚያ ልምምዶች' : 'Self-Study Practice Questions'}
          </p>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
            {lang === 'am'
              ? 'እነዚህ ጥያቄዎች እራስዎትን ለመፈተሽ የሚረዱ ሲሆኑ፣ የክፍል ውጤትዎን ወይም የማለፊያ ነጥብዎን አይወስኑም። መልስ ሲመርጡ ትክክል መሆኑ ወዲያውኑ ይታያል።'
              : 'These questions are formative exercises for personal self-assessment. They do not affect your graded scores or completion records. Pick an answer to see right away whether it is correct.'}
          </p>
        </div>
      </div>

      {/* Export / Print; inside Telegram (no printing or downloads) the bot sends the sheet to the chat */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
        <label className="inline-flex items-center space-x-2 text-xs font-semibold text-stone-700 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={exportWithAnswers}
            onChange={(e) => setExportWithAnswers(e.target.checked)}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <span>{lang === 'am' ? 'መልሶችን አካትት' : 'Include answers'}</span>
        </label>
        <button
          type="button"
          disabled={sendingExport}
          onClick={async () => {
            const options: PracticeExportOptions = {
              questions,
              heading: exportHeading || (lang === 'am' ? 'የልምምድ ጥያቄዎች' : 'Practice Questions'),
              subheading: exportSubheading,
              includeAnswers: exportWithAnswers,
              lang,
            };
            if (!isTelegram) {
              printPracticeQuestions(options);
              return;
            }
            setSendingExport(true);
            try {
              await sendFileToTelegramChat(
                () =>
                  api.sendExportToTelegram({
                    fileName: `${options.heading} - ${lang === 'am' ? 'የልምምድ ጥያቄዎች' : 'Practice Questions'}`,
                    html: buildDocument(options),
                    caption: lang === 'am' ? 'ፋይሉን ከፍተው ማንበብ ወይም ማተም ይችላሉ።' : 'Open the file to read or print it.',
                  }),
                lang
              );
            } finally {
              setSendingExport(false);
            }
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-eotc-navy dark:bg-amber-500 text-white dark:text-slate-950 hover:opacity-90 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
        >
          {isTelegram ? (
            <>
              {sendingExport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{lang === 'am' ? 'ወደ ቴሌግራም ላክ' : 'Send to Telegram'}</span>
            </>
          ) : (
            <>
              <Printer className="w-4 h-4" />
              <span>{lang === 'am' ? 'PDF አውጣ / አትም' : 'Export PDF / Print'}</span>
            </>
          )}
        </button>
      </div>

      {questions.length > 1 && (
        <QuestionTypeFilter questions={questions} value={typeFilter} onChange={setTypeFilter} lang={lang} />
      )}

      {/* Running score for the questions answered so far */}
      {answered.length > 0 && (
        <div
          key={answered.length}
          className="eotc-rise flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-xs sm:text-sm"
          aria-live="polite"
        >
          <span className="font-bold text-stone-800 dark:text-slate-100">
            {lang === 'am' ? 'የእርስዎ ውጤት' : 'Your score'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            {correctCount} / {answered.length}
            <span className="font-semibold text-stone-500 dark:text-slate-400">
              {lang === 'am' ? 'ትክክል' : 'correct'}
            </span>
          </span>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {visibleQuestions.map((q, idx) => {
          const isRevealed = !!revealedAnswers[q.id];
          const picked = selectedChoices[q.id];
          const isChoiceQuestion = q.questionType !== 'SHORT_ANSWER';
          const correctKey = isChoiceQuestion ? correctKeyOf(q) : null;
          // Picking an answer shows the result straight away
          const showResult = isRevealed || (!!picked && !!correctKey);
          const pickedCorrect = !!picked && picked === correctKey;
          const questionPrompt = q.prompt;
          const explanation = q.explanation;
          const answerText = q.answerText;
          const tfLabel = (key: string | null) =>
            key === 'TRUE' ? (lang === 'am' ? 'እውነት' : 'True') : key === 'FALSE' ? (lang === 'am' ? 'ሐሰት' : 'False') : '';

          const optionStyle = (key: string, isSelected: boolean) => {
            if (!showResult) {
              return 'bg-stone-50 dark:bg-slate-950 hover:bg-stone-100 dark:hover:bg-slate-800 border-stone-200 dark:border-slate-800 text-stone-800 dark:text-slate-200 cursor-pointer';
            }
            if (key === correctKey) {
              return `bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold ring-2 ring-emerald-400/60 ${isSelected ? 'eotc-pop' : ''}`;
            }
            if (isSelected) {
              return 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 text-rose-900 dark:text-rose-200 font-semibold ring-2 ring-rose-300/60 eotc-shake';
            }
            return 'bg-stone-50 dark:bg-slate-950 border-stone-200 dark:border-slate-800 text-stone-500 dark:text-slate-500 opacity-70';
          };

          return (
            <div
              key={q.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-6 shadow-xs space-y-4 transition-colors ${
                picked && correctKey
                  ? pickedCorrect
                    ? 'border-emerald-300 dark:border-emerald-800'
                    : 'border-rose-300 dark:border-rose-900'
                  : 'border-stone-200 dark:border-slate-800'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                        {q.questionType === 'TRUE_FALSE'
                          ? lang === 'am' ? 'እውነት / ሐሰት' : 'True / False'
                          : q.questionType === 'SHORT_ANSWER'
                          ? lang === 'am' ? 'አጭር መልስ' : 'Short Answer'
                          : lang === 'am' ? 'ባለብዙ ምርጫ' : 'Multiple Choice'}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-stone-900 dark:text-white text-sm sm:text-base leading-snug">
                      {questionPrompt}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Multiple Choice Answers */}
              {q.questionType === 'MULTIPLE_CHOICE' && q.choices && q.choices.length > 0 && (
                <div className="space-y-2 pt-1">
                  {q.choices.map((choice) => {
                    const key = choice.id || '';
                    const isSelected = picked === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectChoice(q, key)}
                        disabled={!!picked}
                        className={`relative w-full text-left p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors ${optionStyle(key, isSelected)}`}
                      >
                        <span className="leading-relaxed">{choice.text}</span>
                        {showResult && key === correctKey && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {showResult && isSelected && key !== correctKey && (
                          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        {isSelected && pickedCorrect && bursts[q.id] && <ConfettiBurst key={bursts[q.id]} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* True / False Selection */}
              {q.questionType === 'TRUE_FALSE' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(['TRUE', 'FALSE'] as const).map((key) => {
                    const isSelected = picked === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectChoice(q, key)}
                        disabled={!!picked}
                        className={`relative py-3 px-4 rounded-xl border text-center font-bold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2 ${optionStyle(key, isSelected)}`}
                      >
                        <span>{tfLabel(key)}</span>
                        {showResult && key === correctKey && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        {showResult && isSelected && key !== correctKey && <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                        {isSelected && pickedCorrect && bursts[q.id] && <ConfettiBurst key={bursts[q.id]} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Instant feedback once an answer is picked */}
              {picked && correctKey && (
                <div
                  className={`eotc-rise p-3.5 rounded-xl border text-xs sm:text-sm space-y-2 ${
                    pickedCorrect
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-900 dark:text-rose-200'
                  }`}
                  role="status"
                >
                  <div className="flex items-center gap-2 font-extrabold">
                    {pickedCorrect ? (
                      <>
                        <PartyPopper className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{lang === 'am' ? 'ጎበዝ! ትክክለኛ መልስ ነው።' : 'Well done! That is correct.'}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{lang === 'am' ? 'ትክክል አይደለም።' : 'Not quite.'}</span>
                      </>
                    )}
                  </div>
                  {!pickedCorrect && (
                    <p className="pl-7 font-semibold text-emerald-800 dark:text-emerald-300">
                      {lang === 'am' ? 'ትክክለኛው መልስ፦ ' : 'Correct answer: '}
                      {q.questionType === 'TRUE_FALSE'
                        ? tfLabel(correctKey)
                        : q.choices?.find((c) => c.id === correctKey)?.text}
                    </p>
                  )}
                  {explanation && (
                    <p className="pl-7 flex items-start gap-1.5 text-stone-700 dark:text-slate-300">
                      <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{explanation}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Short Answer Input */}
              {q.questionType === 'SHORT_ANSWER' && (
                <div className="pt-1">
                  <textarea
                    rows={2}
                    value={shortAnswers[q.id] || ''}
                    onChange={(e) =>
                      setShortAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder={
                      lang === 'am'
                        ? 'የእርስዎን መልስ እዚህ ይጻፉ (የግል ማስታወሻ)...'
                        : 'Type your reflection or answer here...'
                    }
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-300 dark:border-slate-700 focus:outline-none focus:border-amber-500 bg-stone-50/50 dark:bg-slate-950 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* Show Answer / Try Again */}
              <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                {picked && correctKey ? (
                  <button
                    type="button"
                    onClick={() => tryAgain(q.id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{lang === 'am' ? 'እንደገና ሞክር' : 'Try again'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleRevealAnswer(q.id)}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isRevealed
                        ? 'bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    }`}
                  >
                    {isRevealed ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>{lang === 'am' ? 'መልሱን ደብቅ' : 'Hide Answer'}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'am' ? 'መልሱን አሳይ' : 'Show Answer'}</span>
                      </>
                    )}
                  </button>
                )}

                {q.hasAnswer === false && (
                  <span className="text-[11px] text-stone-400 dark:text-slate-500 italic">
                    {lang === 'am'
                      ? 'ክፍት የውይይት/የማሰላሰያ ጥያቄ'
                      : 'Open reflection question'}
                  </span>
                )}
              </div>

              {/* Revealed Answer & Spiritual Explanation (when shown without picking) */}
              {isRevealed && !picked && (
                <div className="eotc-rise p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs sm:text-sm space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-950 dark:text-emerald-200 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{lang === 'am' ? 'ትክክለኛ መልስ / ማብራሪያ' : 'Answer & Explanation'}</span>
                  </div>

                  {q.questionType === 'TRUE_FALSE' && correctKey ? (
                    <div className="text-emerald-900 dark:text-emerald-300 leading-relaxed font-semibold pl-6">
                      {tfLabel(correctKey)}
                    </div>
                  ) : answerText ? (
                    <div className="text-emerald-900 dark:text-emerald-300 leading-relaxed font-semibold pl-6 whitespace-pre-line">
                      {answerText}
                    </div>
                  ) : q.choices?.some((c) => c.isCorrect) ? (
                    <div className="text-emerald-900 dark:text-emerald-300 leading-relaxed font-semibold pl-6">
                      {q.choices
                        .filter((c) => c.isCorrect)
                        .map((c) => c.text)
                        .join(' | ')}
                    </div>
                  ) : (
                    <div className="text-emerald-800 dark:text-emerald-300 pl-6 italic">
                      {lang === 'am'
                        ? 'ይህ ጥያቄ ክፍት የማሰላሰያ ጥያቄ ስለሆነ የተወሰነ አንድ መልስ የለውም።'
                        : 'This is an open contemplation question without a single rigid answer.'}
                    </div>
                  )}

                  {explanation && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/70 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs pl-6 flex items-start space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{explanation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
