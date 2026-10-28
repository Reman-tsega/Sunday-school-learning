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
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import type { PracticeQuestionDto } from '@eotc/shared';

interface PracticeQuestionListProps {
  chapterId: string;
  questions: PracticeQuestionDto[];
  loading?: boolean;
}

export function PracticeQuestionList({
  questions,
  loading = false,
}: PracticeQuestionListProps) {
  const { lang, pick } = useLanguage();
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});

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
      <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center text-stone-500 space-y-2">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">
          {lang === 'am' ? 'የልምምድ ጥያቄዎችን በማዘጋጀት ላይ...' : 'Loading practice drill questions...'}
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center text-stone-500 space-y-3">
        <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto border border-amber-200">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-stone-800 text-sm sm:text-base">
          {lang === 'am' ? 'ምንም የልምምድ ጥያቄ አልተካተተም' : 'No Practice Questions Available'}
        </h4>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
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
      <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start space-x-3 text-xs text-amber-950">
        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold">
            {lang === 'am' ? 'የራስ-ዕውቀት መገምገሚያ ልምምዶች (Drill Questions)' : 'Self-Study Practice Drills'}
          </p>
          <p className="text-[11px] text-amber-800 mt-0.5">
            {lang === 'am'
              ? 'እነዚህ ጥያቄዎች እራስዎትን ለመፈተሽ የሚረዱ ሲሆኑ፣ የክፍል ውጤትዎን ወይም የማለፊያ ነጥብዎን አይወስኑም። መልሱን ለማየት «መልሱን አሳይ» የሚለውን ይጫኑ።'
              : 'These questions are formative exercises for personal self-assessment. They do not affect your graded scores or completion records. Tap "Show Answer" at any time to verify.'}
          </p>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const isRevealed = !!revealedAnswers[q.id];
          const questionPrompt = pick(q.amharicPrompt, q.prompt);
          const explanation = pick(q.amharicExplanation, q.explanation);
          const answerText = pick(q.amharicAnswerText, q.answerText);

          return (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4 transition"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                        {q.questionType === 'TRUE_FALSE'
                          ? lang === 'am' ? 'እውነት / ሐሰት' : 'True / False'
                          : q.questionType === 'SHORT_ANSWER'
                          ? lang === 'am' ? 'አጭር መልስ' : 'Short Answer'
                          : lang === 'am' ? 'ባለብዙ ምርጫ' : 'Multiple Choice'}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-snug">
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

                    let choiceStyle = 'bg-stone-50 hover:bg-stone-100/80 border-stone-200 text-stone-800';
                    if (isSelected && !isRevealed) {
                      choiceStyle = 'bg-amber-50 border-amber-400 text-amber-950 font-semibold ring-1 ring-amber-400';
                    } else if (isRevealed) {
                      if (isChoiceCorrect) {
                        choiceStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                      } else if (isSelected && !isChoiceCorrect) {
                        choiceStyle = 'bg-rose-50 border-rose-300 text-rose-900';
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
                          {pick(choice.amharicText, choice.text)}
                        </span>
                        {isRevealed && isChoiceCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {isRevealed && isSelected && !isChoiceCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

                    let tfStyle = 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800';
                    if (isSelected && !isRevealed) {
                      tfStyle = 'bg-amber-50 border-amber-400 text-amber-950 font-bold ring-1 ring-amber-400';
                    } else if (isRevealed) {
                      if (isCorrect) {
                        tfStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                      } else if (isSelected && !isCorrect) {
                        tfStyle = 'bg-rose-50 border-rose-300 text-rose-900';
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
                        {isRevealed && isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
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
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50/50"
                  />
                </div>
              )}

              {/* Show Answer / Reveal Toggle */}
              <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleRevealAnswer(q.id)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isRevealed
                      ? 'bg-stone-200 hover:bg-stone-300 text-stone-800'
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
                  <span className="text-[11px] text-stone-400 italic">
                    {lang === 'am'
                      ? 'ክፍት የውይይት/የማሰላሰያ ጥያቄ'
                      : 'Open reflection drill'}
                  </span>
                )}
              </div>

              {/* Revealed Answer & Spiritual Explanation */}
              {isRevealed && (
                <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs sm:text-sm space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center space-x-2 text-emerald-950 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === 'am' ? 'ትክክለኛ መልስ / ማብራሪያ' : 'Answer & Explanation'}</span>
                  </div>

                  {answerText ? (
                    <div className="text-emerald-900 leading-relaxed font-semibold pl-6">
                      {answerText}
                    </div>
                  ) : q.choices?.some((c) => c.isCorrect) ? (
                    <div className="text-emerald-900 leading-relaxed font-semibold pl-6">
                      {q.choices
                        .filter((c) => c.isCorrect)
                        .map((c) => pick(c.amharicText, c.text))
                        .join(' | ')}
                    </div>
                  ) : (
                    <div className="text-emerald-800 pl-6 italic">
                      {lang === 'am'
                        ? 'ይህ ጥያቄ ክፍት የማሰላሰያ ጥያቄ ስለሆነ የተወሰነ አንድ መልስ የለውም።'
                        : 'This is an open contemplation drill without a single rigid answer.'}
                    </div>
                  )}

                  {explanation && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/70 text-emerald-800 text-xs pl-6 flex items-start space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
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
