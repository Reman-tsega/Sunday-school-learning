'use client';

import React from 'react';
import {
  Download,
  FileText,
  GraduationCap,
  Globe,
  LineChart,
  ListChecks,
  Smartphone,
  UserPlus,
  Wifi,
  BookOpen,
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { CrossDivider, Reveal, SectionHeading } from '@/components/landing/Reveal';
import { LandingHero } from '@/components/landing/LandingHero';

function HowItWorks() {
  const { lang } = useLanguage();
  const steps = [
    {
      icon: UserPlus,
      en: ['Register', 'Create a free student account and pick your Sunday School.'],
      am: ['ይመዝገቡ', 'በነጻ የተማሪ መለያ ይፍጠሩ፤ የሚማሩበትን ሰንበት ትምህርት ቤት ይምረጡ።'],
    },
    {
      icon: GraduationCap,
      en: ['Choose your grade', 'Enroll in your grade and see its subjects and chapters.'],
      am: ['ክፍልዎን ይምረጡ', 'በሚማሩበት ክፍል ይመዝገቡ፤ ትምህርቶቹንና ምዕራፎቹን ይመልከቱ።'],
    },
    {
      icon: Download,
      en: ['Download a chapter', 'Save the textbook, quiz and references to your device.'],
      am: ['ምዕራፍ ያውርዱ', 'መጽሐፉን፣ ፈተናውንና ማጣቀሻዎቹን ወደ መሣሪያዎ ያስቀምጡ።'],
    },
    {
      icon: Wifi,
      en: ['Study anywhere, then sync', 'Learn without internet. When you are online, tap Sync to save your progress.'],
      am: ['በየትኛውም ቦታ ይማሩ፣ ከዚያ ያመሳስሉ', 'ያለ ኢንተርኔት ያጥኑ። ኢንተርኔት ሲኖር «አመሳስል»ን ይጫኑ።'],
    },
  ];

  return (
    <section aria-labelledby="how-title" className="space-y-8">
      <Reveal>
        <SectionHeading
          id="how-title"
          eyebrow={lang === 'am' ? 'እንዴት ይሰራል' : 'How it works'}
          title={lang === 'am' ? 'በአራት ቀላል ደረጃዎች' : 'Four simple steps'}
        />
      </Reveal>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => {
          const [title, text] = lang === 'am' ? s.am : s.en;
          return (
            <li key={title}>
              <Reveal delayMs={i * 80} className="h-full">
                <div className="h-full rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                      <s.icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                      {lang === 'am' ? `ደረጃ ${i + 1}` : `Step ${i + 1}`}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-stone-900 dark:text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-slate-300">{text}</p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Features() {
  const { lang } = useLanguage();
  const features = [
    {
      icon: Download,
      en: ['Offline downloads', 'Download a chapter once and read it anywhere, with or without internet.'],
      am: ['ያለ ኢንተርኔት ማውረድ', 'ምዕራፍን አንዴ ያውርዱ፤ ኢንተርኔት ቢኖርም ባይኖርም በየትኛውም ቦታ ያንብቡ።'],
    },
    {
      icon: ListChecks,
      en: ['Graded quizzes', 'Test what you learned after every chapter and see your score.'],
      am: ['ውጤት ያላቸው ፈተናዎች', 'ከእያንዳንዱ ምዕራፍ በኋላ የተማሩትን ይፈትኑ፤ ውጤትዎንም ይመልከቱ።'],
    },
    {
      icon: FileText,
      en: ['Practice questions with PDF export', 'Practice with answers and explanations, then print or save them as a PDF.'],
      am: ['የልምምድ ጥያቄዎች በPDF', 'ጥያቄዎችን ከመልሶቻቸውና ከማብራሪያዎቻቸው ጋር ይለማመዱ፤ ያትሙ ወይም በPDF ያስቀምጡ።'],
    },
    {
      icon: LineChart,
      en: ['Progress tracking', 'Follow your completed chapters, subjects and grades.'],
      am: ['ሂደት መከታተል', 'ያጠናቀቋቸውን ምዕራፎች፣ ትምህርቶችና ክፍሎች ይከታተሉ።'],
    },
    {
      icon: Globe,
      en: ['Amharic and English', 'Switch the whole platform between አማርኛ and English any time.'],
      am: ['አማርኛና እንግሊዝኛ', 'መድረኩን በማንኛውም ጊዜ በአማርኛና በእንግሊዝኛ መካከል ይቀያይሩ።'],
    },
    {
      icon: Smartphone,
      en: ['Install like an app', 'Add it to your home screen for one-tap access.'],
      am: ['እንደ መተግበሪያ ይጫኑ', 'በአንድ ጠቅታ ለመክፈት ወደ መነሻ ገጽዎ ያክሉት።'],
    },
  ];

  return (
    <section aria-labelledby="features-title" className="space-y-8">
      <Reveal>
        <SectionHeading
          id="features-title"
          eyebrow={lang === 'am' ? 'ምን ያገኛሉ' : 'What you get'}
          title={lang === 'am' ? 'ለመማር የሚያስፈልግዎ ሁሉ በአንድ ቦታ' : 'Everything you need to learn, in one place'}
        />
      </Reveal>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => {
          const [title, text] = lang === 'am' ? f.am : f.en;
          return (
            <li key={title}>
              <Reveal delayMs={(i % 3) * 80} className="h-full">
                <div className="h-full rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition hover:border-amber-400/60 hover:shadow-md">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0C2340] text-amber-300">
                    <f.icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-base font-extrabold text-stone-900 dark:text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-slate-300">{text}</p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Everything above the curriculum preview on the public landing page. */
export function LandingTop() {
  const { lang } = useLanguage();
  return (
    <div className="space-y-12 sm:space-y-16">
      <LandingHero />
      <HowItWorks />
      <Features />
      <CrossDivider />
      <Reveal>
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <p className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">
            <BookOpen className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            {lang === 'am' ? 'ሥርዓተ ትምህርት' : 'Curriculum'}
          </p>
          <h2 className="text-xl sm:text-3xl font-extrabold text-stone-900 dark:text-white leading-snug">
            {lang === 'am' ? 'ከመመዝገብዎ በፊት ሥርዓተ ትምህርቱን ይመልከቱ' : 'Browse the curriculum before you register'}
          </h2>
          <p className="text-sm sm:text-base text-stone-600 dark:text-slate-300 leading-relaxed">
            {lang === 'am'
              ? 'ክፍሎችን ይክፈቱና ትምህርቶችንና ምዕራፎችን ይመልከቱ። ለማጥናት ወይም ለመፈተን በነጻ ይመዝገቡ።'
              : 'Open a grade to see its subjects and chapters. Register free to study or take a quiz.'}
          </p>
        </div>
      </Reveal>
    </div>
  );
}
