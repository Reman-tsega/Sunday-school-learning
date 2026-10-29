'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  WifiOff,
  ShieldCheck,
  GraduationCap,
  Compass,
  Heart,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function AboutPage() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-12 shadow-xl border border-stone-800 dark:border-slate-800">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <span>✞</span>
              <span>
                {lang === 'am' ? 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን' : 'Ethiopian Orthodox Tewahedo Church'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              {lang === 'am'
                ? 'የሰንበት ትምህርት ቤት አንድነት ዘመናዊ የመማሪያ መድረክ'
                : 'Sunday School Unity Digital Learning Platform'}
            </h1>

            <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
              {lang === 'am'
                ? 'ኦርቶዶክሳዊ ትምህርተ ሃይማኖትን፣ ሥርዓተ ቤተክርስቲያንን፣ የቤተክርስቲያን ታሪክን እና መንፈሳዊ ሥነ-ምግባርን ለሁሉም ምዕመናን እና ሕፃናት በተደራጀ መንገድ በየትኛውም ቦታ፣ በበይነ-መረብም ሆነ ያለ በይነ-መረብ (Offline) ለማዳረስ የተዘጋጀ የተሟላ የትምህርት መድረክ ነው።'
                : 'A dedicated ecclesiastical EdTech platform engineered to preserve, teach, and disseminate authentic Ethiopian Orthodox Tewahedo Church Sunday School curricula to students everywhere — seamlessly online and truly offline.'}
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/login?mode=register"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow transition flex items-center space-x-2"
              >
                <span>{lang === 'am' ? 'በነጻ ይመዝገቡ' : 'Enroll as a Student'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs sm:text-sm border border-slate-700 transition flex items-center space-x-2"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{lang === 'am' ? 'ሥርዓተ ትምህርቱን ይመልከቱ' : 'Explore Curriculum'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Core Pillars Grid */}
        <div className="space-y-4">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
              {lang === 'am' ? 'የመድረኩ ዓበይት ዓላማዎች' : 'Core Platform Pillars'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
              {lang === 'am'
                ? 'የቀደመውን እምነትና ሥርዓት ከዘመናዊ የትምህርት ቴክኖሎጂ ጋር በማስተባበር የተገነባ'
                : 'Harmonizing ancient patristic wisdom with state-of-the-art educational engineering'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Pillar 1 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 space-y-3 transition">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                {lang === 'am' ? 'ትክክለኛ ኦርቶዶክሳዊ ትምህርት' : 'Authentic Canonical Teaching'}
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                {lang === 'am'
                  ? 'በሊቃውንተ ቤተክርስቲያን እና በሰንበት ት/ቤት አንድነት የተዘጋጁ ይፋዊ መጻሕፍትን፣ የነገረ መለኮት፣ የታሪክ እና የሥርዓት ትምህርቶችን በቀጥታ ያቀርባል።'
                  : 'Delivers vetted textbooks covering Dogmatic Theology, Church History, Liturgy, Ge\'ez, and Christian Ethics under official ecclesiastical oversight.'}
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 space-y-3 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                {lang === 'am' ? 'ሙሉ ከመስመር ውጭ (Offline) አሠራር' : 'True Offline-First Study'}
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                {lang === 'am'
                  ? 'የኢንተርኔት ግንኙነት በማይኖርበት ጊዜም መጻሕፍትን ማንበብ፣ ጥያቄዎችን መመለስ እና ማጥናት ይቻላል። መስመር ሲገኝ ሁሉም ውጤት በራስ-ሰር ይመሳሰላል።'
                  : 'Download curriculum packages once to read chapter PDFs and take quizzes completely offline. All student scores sync automatically when back online.'}
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 space-y-3 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                {lang === 'am' ? 'የተደራጀ የክፍል ደረጃዎች' : 'Structured Multi-Grade Progression'}
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                {lang === 'am'
                  ? 'ከ1ኛ ክፍል ጀምሮ እስከ ከፍተኛ ደረጃ ድረስ የተከፋፈሉ ክፍሎች፣ የትምህርት ዓይነቶች እና በገጽ የተከፋፈሉ ምዕራፎች ያሉት ሥርዓት ነው።'
                  : 'Complete curriculum from Grade 1 upwards with chapters, chapter-isolated page boundaries, reference materials, and evaluation quizzes.'}
              </p>
            </div>
          </div>
        </div>

        {/* Platform Features Deep Dive */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 space-y-6 transition">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white flex items-center space-x-2">
            <Compass className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>{lang === 'am' ? 'የመድረኩ ልዩ ገጽታዎች' : 'Key Platform Capabilities'}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start space-x-3 p-3 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200/60 dark:border-slate-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white block mb-0.5">
                  {lang === 'am' ? 'ምዕራፍ-ተኮር የፒዲኤፍ ንባብ (Chapter Isolated PDF)' : 'Chapter-Isolated PDF Reading'}
                </span>
                <span className="text-stone-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'አንድ መጽሐፍ ለአንድ የትምህርት ዓይነት ተጭኖ በገጽ ይከፋፈላል፤ ተማሪው የሚያነበው የተመደበለትን የምዕራፍ ገጾች ብቻ ነው።'
                    : 'A single master PDF per subject is trimmed to chapter page ranges, displaying Page 1 of N without accidental cross-chapter leakage.'}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200/60 dark:border-slate-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white block mb-0.5">
                  {lang === 'am' ? 'ባለ ሁለት ቋንቋ ድጋፍ (Bilingual Support)' : 'Bilingual Support (Amharic & English)'}
                </span>
                <span className="text-stone-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'በአንድ ጠቅታ በመላው መድረክ አማርኛ ወይም እንግሊዝኛ መምረጥ ይቻላል፤ ቋንቋዎች ተደባልቀው አይታዩም።'
                    : 'Seamless 1-click toggle between full Amharic and English interfaces without mixed translations.'}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200/60 dark:border-slate-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white block mb-0.5">
                  {lang === 'am' ? 'የማስታወቂያ መላኪያ ሥርዓት (Targeted Announcements)' : 'Smart Broadcast Notifications'}
                </span>
                <span className="text-stone-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'አስተዳዳሪዎችና መምህራን ለሁሉም ወይም ለተወሰነ ክፍል ብቻ መልእክትና ማስታወቂያ ማስተላለፍ ይችላሉ።'
                    : 'Targeted announcements filterable by grade, role, or platform-wide broadcast with unread counters.'}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200/60 dark:border-slate-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white block mb-0.5">
                  {lang === 'am' ? 'በርካታ ክፍሎች መመዝገብ (Multi-Grade Registration)' : 'Multi-Grade Student Enrollment'}
                </span>
                <span className="text-stone-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'ተማሪዎች በአንድ ጊዜ ከአንድ በላይ ክፍሎች መመዝገብና የመረጧቸውን ክፍሎች ለይተው መከታተል ይችላሉ።'
                    : 'Students can enroll in multiple grades simultaneously and switch views effortlessly.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Banner */}
        <div className="p-8 bg-amber-500/10 dark:bg-amber-950/20 rounded-3xl border border-amber-500/30 dark:border-amber-800/40 text-center space-y-3">
          <Heart className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-stone-900 dark:text-white">
            {lang === 'am' ? 'የቤተክርስቲያናችንን ትምህርት በጋራ እናዳብር' : 'Nurturing Our Sacred Faith Together'}
          </h3>
          <p className="text-xs text-stone-600 dark:text-slate-400 max-w-xl mx-auto">
            {lang === 'am'
              ? 'ይህ መድረክ የተዘጋጀው ለሰንበት ት/ቤት ተማሪዎች፣ ለመምህራን እና ለወላጆች ምቹ የትምህርት ዕድል ለመፍጠር ነው።'
              : 'Built with reverence to serve Sunday school students, teachers, and orthodox families around the globe.'}
          </p>
        </div>
      </div>
    </div>
  );
}
