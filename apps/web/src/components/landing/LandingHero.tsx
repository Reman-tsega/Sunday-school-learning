'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  Globe,
  HelpCircle,
  RefreshCw,
  Trophy,
  WifiOff,
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

type Lang = 'am' | 'en';

/** Chapter card on a phone with floating status chips. Decorative placeholder content, not real data. */
function PhoneIllustration({ lang }: { lang: Lang }) {
  return (
    <div aria-hidden="true" className="relative mx-auto w-[230px] sm:w-[260px] lg:mx-0 lg:ml-auto lg:mr-6">
      <div className="absolute -inset-12 rounded-full bg-amber-400/20 blur-3xl" />

      <div className="relative rounded-[2.3rem] border border-white/20 bg-slate-950/90 p-3 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/15" />
        <div className="space-y-3 rounded-[1.5rem] bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {lang === 'am' ? 'ምዕራፍ 1' : 'Chapter 1'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              {lang === 'am' ? 'ያለ ኢንተርኔት' : 'Ready offline'}
            </span>
          </div>
          <p className="text-[13px] font-extrabold leading-snug text-stone-900">
            {lang === 'am' ? 'የክርስትና እምነት መሠረቶች' : 'Foundations of Christian Faith'}
          </p>
          <div>
            <div className="mb-1 flex justify-between text-[9px] font-semibold text-stone-500">
              <span>{lang === 'am' ? 'ሂደት' : 'Progress'}</span>
              <span>68%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
            </div>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#0C2340] py-2 text-[10px] font-bold text-white">
              <BookOpen className="h-3 w-3" />
              {lang === 'am' ? 'ተማር' : 'Study'}
            </span>
            <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-amber-100 py-2 text-[10px] font-bold text-amber-900">
              <HelpCircle className="h-3 w-3" />
              {lang === 'am' ? 'ፈተና' : 'Quiz'}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 p-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-xs text-amber-300">✞</span>
          <div className="flex-1 space-y-1">
            <div className="h-1.5 w-3/4 rounded bg-white/20" />
            <div className="h-1.5 w-1/2 rounded bg-white/10" />
          </div>
        </div>
      </div>

      {/* Floating chips */}
      <div className="eotc-float absolute -left-8 top-10 hidden items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
          <Download className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-bold text-white">{lang === 'am' ? 'ወርዷል' : 'Downloaded'}</span>
      </div>
      <div className="eotc-float-slow absolute -right-6 top-24 hidden items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
          <RefreshCw className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-bold text-white">{lang === 'am' ? 'ተመሳስሏል' : 'Synced'}</span>
      </div>
      <div className="eotc-float absolute -left-6 bottom-8 hidden items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
          <Trophy className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-bold text-white">{lang === 'am' ? 'ፈተና ተሳክቷል' : 'Quiz passed'}</span>
      </div>
    </div>
  );
}

export function LandingHero() {
  const { lang } = useLanguage();

  const trust = [
    { icon: WifiOff, en: 'Works offline', am: 'ያለ ኢንተርኔት ይሰራል' },
    { icon: Globe, en: 'አማርኛ & English', am: 'አማርኛ እና English' },
    { icon: CheckCircle2, en: 'Free for students', am: 'ለተማሪዎች ነጻ' },
  ];

  return (
    <section
      aria-labelledby="landing-title"
      className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#0C2340] text-white shadow-2xl ring-1 ring-amber-400/20 sm:rounded-[2rem]"
    >
      {/* Layered background: gradient, soft glows, fine dot grid and a faint cross watermark */}
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

      <div className="grid items-center gap-10 px-5 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 sm:text-xs">
            <span aria-hidden="true">✞</span>
            {lang === 'am' ? 'የኢኦተቤ ሰንበት ትምህርት ቤት መድረክ' : 'EOTC Sunday School Platform'}
          </span>

          <h1 id="landing-title" className="text-[2rem] font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            {lang === 'am' ? 'የቤተ ክርስቲያንን ትምህርት ' : 'Learn the faith of the Church, '}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent">
              {lang === 'am' ? 'ያለ ኢንተርኔትም በየትኛውም ቦታ' : 'anywhere, even offline'}
            </span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-slate-200 sm:text-lg">
            {lang === 'am'
              ? 'ለእያንዳንዱ የሰንበት ትምህርት ቤት ክፍል የሚሆኑ መጻሕፍት፣ ፈተናዎች እና የልምምድ ጥያቄዎች። አንድ ጊዜ ያውርዱ፣ በየትኛውም ቦታ ይማሩ፣ ኢንተርኔት ሲኖርዎ ሂደትዎን ያመሳስሉ።'
              : 'Textbooks, quizzes and practice questions for every Sunday School grade. Download once, study anywhere, and sync your progress when you are back online.'}
          </p>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Link
              href="/login?mode=register"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-7 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:from-amber-200 hover:to-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C2340] sm:text-base"
            >
              {lang === 'am' ? 'በነጻ ይመዝገቡ' : 'Register free'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/25 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C2340] sm:text-base"
            >
              {lang === 'am' ? 'ግባ' : 'Sign in'}
            </Link>
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-xs font-semibold text-slate-200 sm:text-sm">
            {trust.map((t) => (
              <li key={t.en} className="inline-flex items-center gap-1.5">
                <t.icon className="h-4 w-4 text-amber-300" aria-hidden="true" />
                {lang === 'am' ? t.am : t.en}
              </li>
            ))}
          </ul>
        </div>

        <PhoneIllustration lang={lang} />
      </div>
    </section>
  );
}
