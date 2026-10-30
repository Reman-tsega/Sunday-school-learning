'use client';

import React from 'react';

export type QuestionTypeFilterValue = 'ALL' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

const OPTIONS: Array<{ value: QuestionTypeFilterValue; en: string; am: string }> = [
  { value: 'ALL', en: 'All', am: 'ሁሉም' },
  { value: 'MULTIPLE_CHOICE', en: 'Multiple Choice', am: 'ባለብዙ ምርጫ' },
  { value: 'TRUE_FALSE', en: 'True / False', am: 'እውነት / ሐሰት' },
  { value: 'SHORT_ANSWER', en: 'Short Answer', am: 'አጭር መልስ' },
];

interface QuestionTypeFilterProps {
  questions: Array<{ questionType?: string }>;
  value: QuestionTypeFilterValue;
  onChange: (value: QuestionTypeFilterValue) => void;
  lang: 'am' | 'en';
}

/** Filter chips with per-type counts; types with no questions are hidden. */
export function QuestionTypeFilter({ questions, value, onChange, lang }: QuestionTypeFilterProps) {
  const count = (v: QuestionTypeFilterValue) =>
    v === 'ALL' ? questions.length : questions.filter((q) => q.questionType === v).length;

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={lang === 'am' ? 'በጥያቄ አይነት አጣራ' : 'Filter by question type'}>
      {OPTIONS.filter((o) => o.value === 'ALL' || count(o.value) > 0).map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer ${
              active
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>{lang === 'am' ? o.am : o.en}</span>
            <span
              className={`text-[10px] px-1.5 rounded-full ${
                active ? 'bg-white/25' : 'bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400'
              }`}
            >
              {count(o.value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
