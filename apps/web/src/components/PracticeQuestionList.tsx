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
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { QuestionTypeFilter, type QuestionTypeFilterValue } from '@/components/QuestionTypeFilter';
import { printPracticeQuestions } from '@/lib/practice-export';
import type { PracticeQuestionDto } from '@eotc/shared';

interface PracticeQuestionListProps {
  chapterId: string;
  questions: PracticeQuestionDto[];
  loading?: boolean;
  /** Title printed on the exported sheet, e.g. the chapter name */
  exportHeading?: string;
  exportSubheading?: string;
}

export function PracticeQuestionList({
  questions,
  loading = false,
  exportHeading,
  exportSubheading,
}: PracticeQuestionListProps) {
  const { lang } = useLanguage();
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [typeFilter, setTypeFilter] = useState<QuestionTypeFilterValue>('ALL');
  const [exportWithAnswers, setExportWithAnswers] = useState(true);
  const visibleQuestions =
    typeFilter === 'ALL' ? questions : questions.filter((q) => q.questionType === typeFilter);

  const toggleRevealAnswer = (questionId: string) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleSelectChoice = (questionId: string, choiceId: string) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
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
              ? 'እነዚህ ጥያቄዎች እራስዎትን ለመፈተሽ የሚረዱ ሲሆኑ፣ የክፍል ውጤትዎን ወይም የማለፊያ ነጥብዎን አይወስኑም። መልሱን ለማየት «መልሱን አሳይ» የሚለውን ይጫኑ።'
              : 'These questions are formative exercises for personal self-assessment. They do not affect your graded scores or completion records. Tap "Show Answer" at any time to verify.'}
          </p>
        </div>
      </div>

      {/* Export / Print */}
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
          onClick={() =>
            printPracticeQuestions({
              questions,
              heading: exportHeading || (lang === 'am' ? 'የልምምድ ጥያቄዎች' : 'Practice Questions'),
              subheading: exportSubheading,
              includeAnswers: exportWithAnswers,
              lang,
            })
          }
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-eotc-navy dark:bg-amber-500 text-white dark:text-slate-950 hover:opacity-90 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{lang === 'am' ? 'PDF አውጣ / አትም' : 'Export PDF / Print'}</span>
        </button>
      </div>

      {questions.length > 1 && (
        <QuestionTypeFilter questions={questions} value={typeFilter} onChange={setTypeFilter} lang={lang} />
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {visibleQuestions.map((q, idx) => {
          const isRevealed = !!revealedAnswers[q.id];
          const questionPrompt = q.prompt;
          const explanation = q.explanation;
          const answerText = q.answerText;

          return (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4 transition"
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
                    const isSelected = selectedChoices[q.id] === choice.id;
                    const isChoiceCorrect = choice.isCorrect;

                    let choiceStyle = 'bg-stone-50 dark:bg-slate-950 hover:bg-stone-100/80 dark:hover:bg-slate-850 border-stone-200 dark:border-slate-800 text-stone-800 dark:text-slate-200';
                    if (isSelected && !isRevealed) {
                      choiceStyle = 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-200 font-semibold ring-1 ring-amber-400';
                    } else if (isRevealed) {
                      if (isChoiceCorrect) {
                        choiceStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 font-bold';
                      } else if (isSelected && !isChoiceCorrect) {
                        choiceStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200';
                      }
                    }

                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => handleSelectChoice(q.id, choice.id || '')}
                        className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 transition cursor-pointer ${choiceStyle}`}
                      >
                        <span className="leading-relaxed">
                          {choice.text}
                        </span>
                        {isRevealed && isChoiceCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {isRevealed && isSelected && !isChoiceCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* True / False Selection */}
              {q.questionType === 'TRUE_FALSE' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    { key: 'TRUE', label: lang === 'am' ? 'እውነት' : 'True' },
                    { key: 'FALSE', label: lang === 'am' ? 'ሐሰት' : 'False' },
                  ].map((tf) => {
                    const isSelected = selectedChoices[q.id] === tf.key;
                    const isCorrect = answerText?.trim().toUpperCase() === tf.key;

                    let tfStyle = 'bg-stone-50 dark:bg-slate-950 hover:bg-stone-100 dark:hover:bg-slate-850 border-stone-200 dark:border-slate-800 text-stone-800 dark:text-slate-200';
                    if (isSelected && !isRevealed) {
                      tfStyle = 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-200 font-bold ring-1 ring-amber-400';
                    } else if (isRevealed) {
                      if (isCorrect) {
                        tfStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 font-bold';
                      } else if (isSelected && !isCorrect) {
                        tfStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200';
                      }
                    }

                    return (
                      <button
                        key={tf.key}
                        type="button"
                        onClick={() => handleSelectChoice(q.id, tf.key)}
                        className={`py-3 px-4 rounded-xl border text-center font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center space-x-2 ${tfStyle}`}
                      >
                        <span>{tf.label}</span>
                        {isRevealed && isCorrect && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    );
                  })}
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

              {/* Show Answer / Reveal Toggle */}
              <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
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

                {q.hasAnswer === false && (
                  <span className="text-[11px] text-stone-400 dark:text-slate-500 italic">
                    {lang === 'am'
                      ? 'ክፍት የውይይት/የማሰላሰያ ጥያቄ'
                      : 'Open reflection question'}
                  </span>
                )}
              </div>

              {/* Revealed Answer & Spiritual Explanation */}
              {isRevealed && (
                <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs sm:text-sm space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center space-x-2 text-emerald-950 dark:text-emerald-200 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{lang === 'am' ? 'ትክክለኛ መልስ / ማብራሪያ' : 'Answer & Explanation'}</span>
                  </div>

                  {answerText ? (
                    <div className="text-emerald-900 dark:text-emerald-300 leading-relaxed font-semibold pl-6">
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
