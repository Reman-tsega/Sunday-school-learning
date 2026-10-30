'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Heart,
  Languages,
  Megaphone,
  Settings2,
  ShieldCheck,
  Users,
  WifiOff,
  FileText,
  Layers,
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { CrossDivider, Reveal, SectionHeading } from '@/components/landing/Reveal';

const PORTFOLIO_URL = 'https://haile-dev-portifoli.vercel.app/';

export default function AboutPage() {
  const { lang } = useLanguage();
  const t = (en: string, am: string) => (lang === 'am' ? am : en);

  const pillars = [
    {
      icon: ShieldCheck,
      title: t('Authentic Canonical Teaching', 'ትክክለኛ ኦርቶዶክሳዊ ትምህርት'),
      text: t(
        "Delivers vetted textbooks covering Dogmatic Theology, Church History, Liturgy, Ge'ez, and Christian Ethics under official ecclesiastical oversight.",
        'በሊቃውንተ ቤተክርስቲያን እና በሰንበት ት/ቤት አንድነት የተዘጋጁ ይፋዊ መጻሕፍትን፣ የነገረ መለኮት፣ የታሪክ እና የሥርዓት ትምህርቶችን በቀጥታ ያቀርባል።'
      ),
    },
    {
      icon: WifiOff,
      title: t('True Offline-First Study', 'ሙሉ ከመስመር ውጭ (Offline) አሠራር'),
      text: t(
        'Download curriculum packages once to read chapter PDFs and take quizzes completely offline. All student scores sync when back online.',
        'የኢንተርኔት ግንኙነት በማይኖርበት ጊዜም መጻሕፍትን ማንበብ፣ ጥያቄዎችን መመለስ እና ማጥናት ይቻላል። መስመር ሲገኝ ውጤቶች ይመሳሰላሉ።'
      ),
    },
    {
      icon: GraduationCap,
      title: t('Structured Multi-Grade Progression', 'የተደራጀ የክፍል ደረጃዎች'),
      text: t(
        'Complete curriculum from Grade 1 upwards with chapters, chapter-isolated page boundaries, reference materials, and evaluation quizzes.',
        'ከ1ኛ ክፍል ጀምሮ እስከ ከፍተኛ ደረጃ ድረስ የተከፋፈሉ ክፍሎች፣ የትምህርት ዓይነቶች እና በገጽ የተከፋፈሉ ምዕራፎች ያሉት ሥርዓት ነው።'
      ),
    },
  ];

  const capabilities = [
    {
      icon: FileText,
      title: t('Chapter-Isolated PDF Reading', 'ምዕራፍ-ተኮር የፒዲኤፍ ንባብ'),
      text: t(
        'A single master PDF per subject is trimmed to chapter page ranges, displaying Page 1 of N without accidental cross-chapter leakage.',
        'አንድ መጽሐፍ ለአንድ የትምህርት ዓይነት ተጭኖ በገጽ ይከፋፈላል፤ ተማሪው የሚያነበው የተመደበለትን የምዕራፍ ገጾች ብቻ ነው።'
      ),
    },
    {
      icon: Languages,
      title: t('Bilingual Support (Amharic & English)', 'ባለ ሁለት ቋንቋ ድጋፍ'),
      text: t(
        'Seamless 1-click toggle between full Amharic and English interfaces without mixed translations.',
        'በአንድ ጠቅታ በመላው መድረክ አማርኛ ወይም እንግሊዝኛ መምረጥ ይቻላል፤ ቋንቋዎች ተደባልቀው አይታዩም።'
      ),
    },
    {
      icon: Megaphone,
      title: t('Smart Broadcast Notifications', 'የማስታወቂያ መላኪያ ሥርዓት'),
      text: t(
        'Targeted announcements filterable by grade, role, or platform-wide broadcast with unread counters.',
        'አስተዳዳሪዎችና መምህራን ለሁሉም ወይም ለተወሰነ ክፍል ብቻ መልእክትና ማስታወቂያ ማስተላለፍ ይችላሉ።'
      ),
    },
    {
      icon: Layers,
      title: t('Multi-Grade Student Enrollment', 'በርካታ ክፍሎች መመዝገብ'),
      text: t(
        'Students can enroll in multiple grades simultaneously and switch views effortlessly.',
        'ተማሪዎች በአንድ ጊዜ ከአንድ በላይ ክፍሎች መመዝገብና የመረጧቸውን ክፍሎች ለይተው መከታተል ይችላሉ።'
      ),
    },
  ];

  const audiences = [
    {
      icon: BookOpen,
      title: t('Students', 'ተማሪዎች'),
      points: [
        t('Browse grades, subjects and chapters', 'ክፍሎችን፣ ትምህርቶችንና ምዕራፎችን ይመልከቱ'),
        t('Download chapters and study offline', 'ምዕራፎችን አውርደው ያለ ኢንተርኔት ያጥኑ'),
        t('Take quizzes and track progress', 'ፈተና ይውሰዱ፤ ሂደትዎን ይከታተሉ'),
      ],
    },
    {
      icon: Users,
      title: t('Teachers', 'መምህራን'),
      points: [
        t('Follow the students of your Sunday School', 'የሰንበት ትምህርት ቤትዎን ተማሪዎች ይከታተሉ'),
        t('Contribute practice questions and references', 'የልምምድ ጥያቄዎችንና ማጣቀሻዎችን ያበርክቱ'),
        t('Contributions are reviewed before students see them', 'ይዘቱ ተማሪዎች ከማየታቸው በፊት ይገመገማል'),
      ],
    },
    {
      icon: Settings2,
      title: t('Administrators', 'አስተዳዳሪዎች'),
      points: [
        t('Manage curriculum, users and Sunday Schools', 'ሥርዓተ ትምህርትን፣ ተጠቃሚዎችንና ሰንበት ትምህርት ቤቶችን ያስተዳድሩ'),
        t('Review teacher contributions', 'የመምህራንን አስተዋጽኦ ይገምግሙ'),
        t('Send announcements and answer support requests', 'ማስታወቂያ ይላኩ፤ የድጋፍ ጥያቄዎችን ይመልሱ'),
      ],
    },
  ];

  return (
    <div className="bg-stone-50 dark:bg-slate-950 transition-colors">
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:space-y-16 sm:px-6 sm:py-10 lg:px-8">
        {/* Hero */}
        <section
          aria-labelledby="about-title"
          className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#0C2340] text-white shadow-2xl ring-1 ring-amber-400/20 sm:rounded-[2rem]"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_85%_-10%,rgba(251,191,36,0.20),transparent_60%),radial-gradient(900px_500px_at_-10%_110%,rgba(56,189,248,0.12),transparent_55%),linear-gradient(135deg,#0C2340_0%,#0b1b33_55%,#2a1606_100%)]" />
          <div
            className="absolute inset-0 -z-10 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -bottom-10 -right-6 -z-10 select-none text-[16rem] leading-none text-amber-300/[0.05] sm:text-[22rem]"
            aria-hidden="true"
          >
            ✞
          </span>

          <div className="max-w-3xl space-y-6 px-5 py-12 sm:px-12 sm:py-16 lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 sm:text-xs">
              <span aria-hidden="true">✞</span>
              {t('Ethiopian Orthodox Tewahedo Church', 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን')}
            </span>

            <h1 id="about-title" className="text-[2rem] font-black leading-[1.12] tracking-tight sm:text-5xl">
              {lang === 'am' ? (
                <>
                  የሰንበት ትምህርት ቤት{' '}
                  <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                    ዘመናዊ የመማሪያ መድረክ
                  </span>
                </>
              ) : (
                <>
                  Sunday School{' '}
                  <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                    Digital Learning Platform
                  </span>
                </>
              )}
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-lg">
              {t(
                'A dedicated platform to preserve, teach and share authentic Ethiopian Orthodox Tewahedo Church Sunday School curricula with students everywhere, online and offline.',
                'ኦርቶዶክሳዊ ትምህርተ ሃይማኖትን፣ ሥርዓተ ቤተክርስቲያንን፣ የቤተክርስቲያን ታሪክን እና መንፈሳዊ ሥነ-ምግባርን ለሁሉም ምዕመናን እና ሕፃናት በተደራጀ መንገድ በየትኛውም ቦታ፣ በበይነ-መረብም ሆነ ያለ በይነ-መረብ ለማዳረስ የተዘጋጀ የትምህርት መድረክ ነው።'
              )}
            </p>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Link
                href="/login?mode=register"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-7 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:from-amber-200 hover:to-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C2340] sm:text-base"
              >
                {t('Register free', 'በነጻ ይመዝገቡ')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/#curriculum-preview"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C2340] sm:text-base"
              >
                <BookOpen className="h-4 w-4 text-amber-300" aria-hidden="true" />
                {t('Explore curriculum', 'ሥርዓተ ትምህርቱን ይመልከቱ')}
              </Link>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section aria-labelledby="mission-title">
          <Reveal>
            <div className="mx-auto max-w-3xl space-y-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 sm:text-xs">
                {t('Our mission', 'ዓላማችን')}
              </p>
              <h2 id="mission-title" className="text-xl font-extrabold leading-snug text-stone-900 dark:text-white sm:text-3xl">
                {t(
                  'Harmonizing ancient faith with modern educational technology',
                  'የቀደመውን እምነትና ሥርዓት ከዘመናዊ የትምህርት ቴክኖሎጂ ጋር ማስተባበር'
                )}
              </h2>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-slate-300 sm:text-base">
                {t(
                  'Built with reverence to serve Sunday school students, teachers, and Orthodox families around the globe.',
                  'ይህ መድረክ የተዘጋጀው ለሰንበት ት/ቤት ተማሪዎች፣ ለመምህራን እና ለወላጆች ምቹ የትምህርት ዕድል ለመፍጠር ነው።'
                )}
              </p>
            </div>
          </Reveal>
        </section>

        {/* Core pillars */}
        <section aria-labelledby="pillars-title" className="space-y-8">
          <Reveal>
            <SectionHeading
              id="pillars-title"
              eyebrow={t('What we stand for', 'የምንቆምለት')}
              title={t('Core Platform Pillars', 'የመድረኩ ዓበይት ዓላማዎች')}
            />
          </Reveal>
          <ul className="grid gap-4 md:grid-cols-3">
            {pillars.map((p, i) => (
              <li key={p.title}>
                <Reveal delayMs={i * 80} className="h-full">
                  <div className="h-full rounded-3xl border border-stone-200 bg-white p-6 transition hover:border-amber-400/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0C2340] text-amber-300">
                      <p.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold text-stone-900 dark:text-white">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-slate-300">{p.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <CrossDivider />

        {/* Who it serves */}
        <section aria-labelledby="audience-title" className="space-y-8">
          <Reveal>
            <SectionHeading
              id="audience-title"
              eyebrow={t('Who it serves', 'ለማን ነው')}
              title={t('One platform for students, teachers and administrators', 'ለተማሪዎች፣ ለመምህራንና ለአስተዳዳሪዎች አንድ መድረክ')}
            />
          </Reveal>
          <ul className="grid gap-4 md:grid-cols-3">
            {audiences.map((a, i) => (
              <li key={a.title}>
                <Reveal delayMs={i * 80} className="h-full">
                  <div className="h-full rounded-3xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                        <a.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="text-base font-extrabold text-stone-900 dark:text-white">{a.title}</h3>
                    </div>
                    <ul className="mt-4 space-y-2.5">
                      {a.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2 text-sm leading-relaxed text-stone-700 dark:text-slate-300">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {/* Capabilities */}
        <section aria-labelledby="capabilities-title" className="space-y-8">
          <Reveal>
            <SectionHeading
              id="capabilities-title"
              eyebrow={t('Capabilities', 'ገጽታዎች')}
              title={t('Key Platform Capabilities', 'የመድረኩ ልዩ ገጽታዎች')}
            />
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((c, i) => (
              <li key={c.title}>
                <Reveal delayMs={(i % 2) * 80} className="h-full">
                  <div className="flex h-full items-start gap-4 rounded-3xl border border-stone-200 bg-white p-5 transition hover:border-amber-400/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0C2340] text-amber-300">
                      <c.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-stone-900 dark:text-white">{c.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-slate-300">{c.text}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {/* Call to action */}
        <section
          aria-labelledby="about-cta-title"
          className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#0C2340] via-slate-900 to-amber-950 px-5 py-10 text-center text-white sm:px-10 sm:py-14"
        >
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl space-y-4">
            <Heart className="mx-auto h-7 w-7 text-amber-300" aria-hidden="true" />
            <h2 id="about-cta-title" className="text-2xl font-black leading-tight sm:text-4xl">
              {t('Nurturing our sacred faith together', 'የቤተክርስቲያናችንን ትምህርት በጋራ እናዳብር')}
            </h2>
            <p className="text-sm leading-relaxed text-stone-200 sm:text-lg">
              {t(
                'Register for free, choose your grade and download your first chapter.',
                'በነጻ ይመዝገቡ፣ ክፍልዎን ይምረጡ፣ የመጀመሪያውን ምዕራፍ ያውርዱ።'
              )}
            </p>
            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/login?mode=register"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:text-base"
              >
                {t('Register free', 'በነጻ ይመዝገቡ')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/#curriculum-preview"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/30 px-6 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:text-base"
              >
                {t('Browse curriculum', 'ሥርዓተ ትምህርቱን ይመልከቱ')}
              </Link>
            </div>
          </div>
        </section>

        {/* Credit */}
        <footer className="pb-2 text-center text-sm text-stone-600 dark:text-slate-400">
          {t('Developed by', 'የተሠራው በ')}{' '}
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded font-bold text-amber-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400"
          >
            Haile Michael
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{t('(opens portfolio in a new tab)', '(ፖርትፎሊዮ በአዲስ ትር ይከፈታል)')}</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
