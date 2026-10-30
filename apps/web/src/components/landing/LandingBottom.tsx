'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronDown, Church, Download, Eye, ShieldCheck, Users } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { usePwaInstall } from '@/lib/pwa-install';
import { CrossDivider, Reveal, SectionHeading } from '@/components/landing/Reveal';

function TeachersSection() {
  const { lang } = useLanguage();
  const points = [
    {
      icon: Users,
      en: 'Follow the study progress of the students in your Sunday School.',
      am: 'በሰንበት ትምህርት ቤትዎ ያሉ ተማሪዎችን የትምህርት ሂደት ይከታተሉ።',
    },
    {
      icon: Church,
      en: 'Contribute practice questions and reference documents for any chapter.',
      am: 'ለማንኛውም ምዕራፍ የልምምድ ጥያቄዎችንና ማጣቀሻ ሰነዶችን ያበርክቱ።',
    },
    {
      icon: ShieldCheck,
      en: 'Every contribution is reviewed by an administrator before students see it.',
      am: 'ማንኛውም ተጨማሪ ይዘት ተማሪዎች ከማየታቸው በፊት በአስተዳዳሪ ይገመገማል።',
    },
  ];
  return (
    <section aria-labelledby="teachers-title" className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-10">
      <div className="grid gap-8 lg:grid-cols-2 items-center">
        <Reveal>
          <SectionHeading
            id="teachers-title"
            align="left"
            eyebrow={lang === 'am' ? 'ለመምህራን' : 'For teachers'}
            title={lang === 'am' ? 'ለመምህራንና ለሰንበት ትምህርት ቤቶች' : 'For teachers and Sunday Schools'}
            subtitle={
              lang === 'am'
                ? 'መምህራን በተመደቡበት ሰንበት ትምህርት ቤት ተማሪዎችን ይከታተላሉ፤ ተጨማሪ ትምህርታዊ ይዘትም ያበረክታሉ። የመምህር መለያ የሚሰጠው በመድረኩ አስተዳዳሪ ነው።'
                : 'Teachers follow the students of their assigned Sunday School and add supporting material. Teacher accounts are assigned by the platform administrator.'
            }
          />
          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 min-h-[44px] rounded-xl bg-[#0C2340] px-5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {lang === 'am' ? 'የመምህር መግቢያ' : 'Teacher sign in'}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </Reveal>
        <ul className="space-y-3">
          {points.map((p, i) => (
            <li key={p.en}>
              <Reveal delayMs={i * 80}>
                <div className="flex items-start gap-3 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-700 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                    <p.icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-relaxed text-stone-700 dark:text-slate-200">{lang === 'am' ? p.am : p.en}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function InstallSection() {
  const { lang } = useLanguage();
  const { canInstall, isInstalled, install } = usePwaInstall();
  return (
    <section aria-labelledby="install-title" className="rounded-3xl border border-amber-300/50 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 p-5 sm:p-10">
      <Reveal>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] items-center">
          <div className="space-y-2">
            <h2 id="install-title" className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white">
              {lang === 'am' ? 'እንደ መተግበሪያ ይጫኑት' : 'Install it like an app'}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-stone-700 dark:text-slate-300 max-w-2xl">
              {lang === 'am'
                ? 'ወደ መነሻ ገጽዎ ያክሉት፤ በአንድ ጠቅታ ይከፈታል፣ ያለ ኢንተርኔትም ያወረዷቸውን ምዕራፎች ያነባሉ። Android ላይ በአሳሹ ምናሌ «መተግበሪያ ጫን» ይምረጡ፤ iPhone ላይ በSafari «አጋራ» ከዚያ «ወደ መነሻ ገጽ አክል» ይምረጡ።'
                : 'Add it to your home screen to open it in one tap and read your downloaded chapters offline. On Android, choose “Install app” in the browser menu. On iPhone, tap Share in Safari, then “Add to Home Screen”.'}
            </p>
          </div>
          {isInstalled ? (
            <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              {lang === 'am' ? 'መተግበሪያው ተጭኗል' : 'App installed'}
            </p>
          ) : canInstall ? (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-amber-500 px-6 text-sm font-extrabold text-slate-950 shadow transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {lang === 'am' ? 'መተግበሪያውን ጫን' : 'Install app'}
            </button>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}

function FaqTeaser() {
  const { lang } = useLanguage();
  const faqs = [
    {
      en: ['Is it free for students?', 'Yes. Creating a student account and studying on the platform is free.'],
      am: ['ለተማሪዎች ነጻ ነው?', 'አዎ። የተማሪ መለያ መፍጠርና በመድረኩ መማር ነጻ ነው።'],
    },
    {
      en: ['Does it work without internet?', 'Yes, for chapters you have downloaded. Your progress is saved on your device and uploaded when you tap Sync.'],
      am: ['ያለ ኢንተርኔት ይሰራል?', 'አዎ፣ ላወረዷቸው ምዕራፎች። ሂደትዎ በመሣሪያዎ ላይ ይቀመጣል፤ «አመሳስል»ን ሲጫኑ ይላካል።'],
    },
    {
      en: ['Can I use it in Amharic?', 'Yes. Switch between አማርኛ and English at any time from the top bar.'],
      am: ['በአማርኛ መጠቀም እችላለሁ?', 'አዎ። ከላይኛው አሞሌ በማንኛውም ጊዜ በአማርኛና በእንግሊዝኛ መካከል መቀያየር ይችላሉ።'],
    },
    {
      en: ['Can I study more than one grade?', 'Yes. You can enroll in several grades and switch between them.'],
      am: ['ከአንድ በላይ ክፍል መማር እችላለሁ?', 'አዎ። በበርካታ ክፍሎች ተመዝግበው መካከላቸው መቀያየር ይችላሉ።'],
    },
  ];
  return (
    <section aria-labelledby="faq-title" className="space-y-6">
      <Reveal>
        <SectionHeading
          id="faq-title"
          eyebrow={lang === 'am' ? 'ጥያቄዎች' : 'FAQ'}
          title={lang === 'am' ? 'በተደጋጋሚ የሚጠየቁ ጥያቄዎች' : 'Frequently asked questions'}
        />
      </Reveal>
      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((f) => {
          const [q, a] = lang === 'am' ? f.am : f.en;
          return (
            <details
              key={q}
              className="group rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 min-h-[48px] text-sm sm:text-base font-bold text-stone-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown className="w-4 h-4 shrink-0 text-stone-500 dark:text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-stone-600 dark:text-slate-300">{a}</p>
            </details>
          );
        })}
        <div className="text-center pt-2">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            {lang === 'am' ? 'ሁሉንም ጥያቄዎች ይመልከቱ' : 'See all questions'}
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { lang } = useLanguage();
  return (
    <section
      aria-labelledby="cta-title"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0C2340] via-slate-900 to-amber-950 px-5 py-10 text-center text-white sm:px-10 sm:py-14 border border-amber-500/20"
    >
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="relative mx-auto max-w-2xl space-y-4">
        <span className="text-2xl text-amber-300" aria-hidden="true">✞</span>
        <h2 id="cta-title" className="text-2xl sm:text-4xl font-black leading-tight">
          {lang === 'am' ? 'ዛሬውኑ መማር ይጀምሩ' : 'Start learning today'}
        </h2>
        <p className="text-sm sm:text-lg text-stone-200 leading-relaxed">
          {lang === 'am'
            ? 'በነጻ ይመዝገቡ፣ ክፍልዎን ይምረጡ፣ የመጀመሪያውን ምዕራፍ ያውርዱ።'
            : 'Register for free, choose your grade and download your first chapter.'}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link
            href="/login?mode=register"
            className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-amber-500 px-6 text-sm sm:text-base font-extrabold text-slate-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {lang === 'am' ? 'በነጻ ይመዝገቡ' : 'Register free'}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[48px] rounded-xl border border-white/30 px-6 text-sm sm:text-base font-bold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {lang === 'am' ? 'ግባ' : 'Sign in'}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Everything below the curriculum preview on the public landing page. */
export function LandingBottom() {
  return (
    <div className="space-y-12 sm:space-y-16 pt-4">
      <CrossDivider />
      <TeachersSection />
      <InstallSection />
      <FaqTeaser />
      <FinalCta />
    </div>
  );
}
