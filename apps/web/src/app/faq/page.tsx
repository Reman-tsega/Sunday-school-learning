'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, HelpCircle, MessageCircle, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { CrossDivider, Reveal } from '@/components/landing/Reveal';

type Category = 'offline' | 'quizzes' | 'enrollment' | 'textbooks' | 'sync' | 'account';

interface FAQItem {
  id: string;
  category: Category;
  questionEn: string;
  questionAm: string;
  answerEn: string;
  answerAm: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    category: 'offline',
    questionEn: 'How does offline study work without internet access?',
    questionAm: 'ያለ ኢንተርኔት (Offline) እንዴት ማጥናት ይቻላል?',
    answerEn:
      'When you click the "Download / አውርድ" button on any chapter, the platform caches the chapter textbook, quiz questions, and manifest into your browser’s IndexedDB storage. You can then open the app, read pages, and take quizzes without any active Wi-Fi or mobile data.',
    answerAm:
      'በየትኛውም ምዕራፍ ላይ "አውርድ" የሚለውን ስትጫኑ የመማሪያ መጽሐፉ፣ የፈተና ጥያቄዎቹ እና መረጃዎቹ በሙሉ በመሳሪያዎ የዳታቤዝ ማከማቻ (IndexedDB) ውስጥ ይቀመጣሉ። ከዚያ በኋላ ያለ ምንም የኢንተርኔት ግንኙነት መጽሐፉን ማንበብ እና ፈተናዎችን መውሰድ ይችላሉ።',
  },
  {
    id: '2',
    category: 'textbooks',
    questionEn: 'Why is there only one textbook uploaded per subject?',
    questionAm: 'ለአንድ የትምህርት ዓይነት አንድ አጠቃላይ መጽሐፍ ብቻ የሚጫነው ለምንድን ነው?',
    answerEn:
      'To save storage and avoid bulky duplicate uploads, teachers upload one master PDF for the subject. Each chapter is then assigned a startPage and endPage. The reader automatically isolates and displays only the pages designated for that chapter (Page 1 of N).',
    answerAm:
      'ለእያንዳንዱ ምዕራፍ የተለያየ ትልቅ ፒዲኤፍ ከመጫን ይልቅ መምህሩ አንድ ሙሉ መጽሐፍ ይጭናል። ከዚያም ለእያንዳንዱ ምዕራፍ መጀመሪያ እና መጨረሻ ገጽ ይወሰናል። መድረኩ ለተማሪው የተመደበለትን የምዕራፍ ገጾች ብቻ ቆርጦ ያሳየዋል።',
  },
  {
    id: '3',
    category: 'enrollment',
    questionEn: 'Can a student enroll in multiple grades at once?',
    questionAm: 'አንድ ተማሪ በአንድ ጊዜ በበርካታ ክፍሎች መመዝገብ ይችላል?',
    answerEn:
      'Yes! During first-time registration or from the profile settings, you can check all the grades you wish to attend (e.g. Grade 1 and Grade 2). The curriculum view filters to display your enrolled grades first.',
    answerAm:
      'አዎ! በአዲስ ምዝገባ ወቅት ወይም ከመለያዎ ገጽ ላይ መማር የሚፈልጓቸውን ክፍሎች በሙሉ መምረጥ ይችላሉ። የትምህርት ገጹ የተመዘገቡባቸውን ክፍሎች ቅድሚያ ሰጥቶ ያሳየዎታል።',
  },
  {
    id: '4',
    category: 'sync',
    questionEn: 'Why do I see a sync button, and how does it work?',
    questionAm: 'የማመሳሰል (Sync) ቁልፍ የሚጠቅመው ለምንድን ነው?',
    answerEn:
      'If you take quizzes or complete reading chapters while offline, your progress is recorded locally. When your device reconnects to the internet, clicking the "Sync / አመሳስል" button securely uploads all your completed scores and read pages to the central server so they are never lost.',
    answerAm:
      'ከመስመር ውጭ ሆነው ፈተና ሲመልሱ ወይም ምዕራፎችን ሲያነቡ ውጤትዎ በመሳሪያዎ ላይ ተይዞ ይቆያል። ኢንተርኔት ሲያገኙ "አመሳስል" የሚለውን ቁልፍ ሲጫኑ ሁሉም ውጤቶችዎ ወደ ዋናው ሰርቨር ተላልፈው በቋሚነት ይመዘገባሉ።',
  },
  {
    id: '5',
    category: 'quizzes',
    questionEn: 'When is a chapter considered fully completed?',
    questionAm: 'አንድ ምዕራፍ እንደተጠናቀቀ የሚቆጠረው መቼ ነው?',
    answerEn:
      'A chapter is marked as complete once you read the assigned textbook pages and achieve a passing score on the chapter evaluation quiz. If a chapter has no quiz, completing the reading marks it as finished.',
    answerAm:
      'የምዕራፉን ገጾች አንብበው ሲጨርሱ እና የምዕራፉን መመዘኛ ፈተና አልፈው ሲያጠናቅቁ ምዕራፉ ሙሉ ለሙሉ እንደተጠናቀቀ ምልክት ይደረግበታል። ፈተና የሌለው ምዕራፍ ከሆነ ንባቡን ማጠናቀቅ በቂ ነው።',
  },
  {
    id: '6',
    category: 'offline',
    questionEn: 'What types of reference materials are supported for offline study?',
    questionAm: 'ከመስመር ውጭ ምን ዓይነት የማጣቀሻ ሰነዶች ይደገፋሉ?',
    answerEn:
      'The platform supports textbook PDFs, supplemental PDF documents, DOC/DOCX files, and presentation slides (PPT/PPTX). Downloadable attachments can be saved to your local storage for offline reference.',
    answerAm:
      'መድረኩ የፒዲኤፍ (PDF) መጻሕፍትን፣ ተጨማሪ የጽሑፍ ሰነዶችን (DOC/DOCX)፣ እና የስላይድ ማስተማሪያዎችን (PPT/PPTX) ይደግፋል። የወረዱ ሰነዶች ያለ ኢንተርኔት በቀጥታ ይከፈታሉ።',
  },
  {
    id: '7',
    category: 'enrollment',
    questionEn: 'What information is required during student registration?',
    questionAm: 'በምዝገባ ወቅት ምን ዓይነት መረጃዎች ይጠየቃሉ?',
    answerEn:
      'We ask for your Full Name, Password, Age, Residence Address, and the grades you want to enroll in. Email is optional for students (see the question below). You may optionally provide your Christian/Baptismal name, Phone number, and Sunday School name.',
    answerAm:
      'ሙሉ ስም፣ የይለፍ ቃል፣ ዕድሜ፣ የመኖሪያ አድራሻ እና የሚማሩባቸው ክፍሎች ይጠየቃሉ። ለተማሪዎች ኢሜይል አማራጭ ነው (ከታች ያለውን ጥያቄ ይመልከቱ)። በተጨማሪም የክርስትና ስም፣ ስልክ ቁጥር እና የሰንበት ት/ቤት ወይም የአጥቢያ ቤተክርስቲያን ስም እንደ አማራጭ ማስገባት ይችላሉ።',
  },
  {
    id: '8',
    category: 'sync',
    questionEn: 'How does session timeout and login persistence work?',
    questionAm: 'የመለያ መቆየት እና የመውጣት ሥርዓት እንዴት ይሠራል?',
    answerEn:
      'Student logins are kept active for 1 full day for convenient learning. Admin and Teacher accounts automatically expire after 15 minutes of inactivity to protect sensitive ecclesiastical curriculum records.',
    answerAm:
      'ተማሪዎች በቀላሉ እንዲማሩ መለያቸው ለሙሉ 1 ቀን ክፍት ሆኖ ይቆያል። የአስተዳዳሪ እና የመምህራን መለያዎች ግን የደህንነት ጥበቃን ለማረጋገጥ ለ15 ደቂቃዎች ምንም እንቅስቃሴ ካልተደረገባቸው በራስ-ሰር ይዘጋሉ።',
  },
  {
    id: '9',
    category: 'account',
    questionEn: 'Do I need an email address to register as a student?',
    questionAm: 'ተማሪ ሆኜ ለመመዝገብ ኢሜይል ያስፈልገኛል?',
    answerEn:
      'No. Email is optional for students; a username is enough to register and sign in. Teachers and administrators still need an email address. Note that without an email you cannot receive a password reset link.',
    answerAm:
      'አያስፈልግዎትም። ለተማሪዎች ኢሜይል አማራጭ ነው፤ ለመመዝገብና ለመግባት የተጠቃሚ ስም (username) በቂ ነው። መምህራንና አስተዳዳሪዎች ግን ኢሜይል ያስፈልጋቸዋል። ኢሜይል ካላስገቡ የይለፍ ቃል መቀየሪያ አገናኝ መቀበል እንደማይችሉ ያስታውሱ።',
  },
  {
    id: '10',
    category: 'account',
    questionEn: 'I forgot my password. How do I reset it?',
    questionAm: 'የይለፍ ቃሌን ረሳሁት። እንዴት ልቀይረው እችላለሁ?',
    answerEn:
      'On the Sign in page choose "Forgot password?", enter your email and we will send you a link that works once for a limited time. If you registered with only a username and no email, ask a teacher or an administrator to reset your password for you.',
    answerAm:
      'በመግቢያ ገጹ ላይ "የይለፍ ቃል ረስተዋል?" የሚለውን ይምረጡ፤ ኢሜይልዎን ያስገቡ፤ ለተወሰነ ጊዜ ብቻና ለአንድ ጊዜ የሚሰራ አገናኝ እንልክልዎታለን። የተጠቃሚ ስም ብቻ ተጠቅመው ከተመዘገቡ (ኢሜይል ከሌለዎት) የይለፍ ቃልዎን እንዲቀይሩልዎ መምህርዎን ወይም አስተዳዳሪን ይጠይቁ።',
  },
];

const CATEGORIES: { id: 'all' | Category; labelEn: string; labelAm: string }[] = [
  { id: 'all', labelEn: 'All Questions', labelAm: 'ሁሉም ጥያቄዎች' },
  { id: 'offline', labelEn: 'Offline & Downloads', labelAm: 'ከመስመር ውጭ' },
  { id: 'textbooks', labelEn: 'Textbooks', labelAm: 'መጻሕፍት' },
  { id: 'quizzes', labelEn: 'Quizzes & Grading', labelAm: 'ፈተናዎች' },
  { id: 'enrollment', labelEn: 'Grades & Enrollment', labelAm: 'የክፍል ምዝገባ' },
  { id: 'sync', labelEn: 'Sync & Data', labelAm: 'ማመሳሰል' },
  { id: 'account', labelEn: 'Account & Password', labelAm: 'መለያ እና የይለፍ ቃል' },
];

export default function FAQPage() {
  const { lang } = useLanguage();
  const t = (en: string, am: string) => (lang === 'am' ? am : en);
  const baseId = useId();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | Category>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({ '1': true, '2': true });
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(api.getUser()));
    return api.onAuthChange((u) => setSignedIn(Boolean(u)));
  }, []);

  const toggleItem = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const query = search.toLowerCase().trim();
  const filteredItems = FAQ_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !query ||
      item.questionEn.toLowerCase().includes(query) ||
      item.questionAm.toLowerCase().includes(query) ||
      item.answerEn.toLowerCase().includes(query) ||
      item.answerAm.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-stone-50 transition-colors dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8">
        {/* Hero with search */}
        <section
          aria-labelledby="faq-title"
          className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#0C2340] text-white shadow-2xl ring-1 ring-amber-400/20 sm:rounded-[2rem]"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_85%_-10%,rgba(251,191,36,0.20),transparent_60%),radial-gradient(900px_500px_at_-10%_110%,rgba(56,189,248,0.12),transparent_55%),linear-gradient(135deg,#0C2340_0%,#0b1b33_55%,#2a1606_100%)]" />
          <div
            className="absolute inset-0 -z-10 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -bottom-10 -right-6 -z-10 select-none text-[14rem] leading-none text-amber-300/[0.05] sm:text-[20rem]"
            aria-hidden="true"
          >
            ✞
          </span>

          <div className="mx-auto max-w-2xl space-y-5 px-5 py-10 text-center sm:px-10 sm:py-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 sm:text-xs">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {t('FAQ', 'ጥያቄዎች')}
            </span>
            <h1 id="faq-title" className="text-[1.9rem] font-black leading-[1.15] tracking-tight sm:text-5xl">
              {lang === 'am' ? (
                <>
                  ተደጋጋሚ{' '}
                  <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                    ጥያቄዎች እና መልሶች
                  </span>
                </>
              ) : (
                <>
                  Frequently{' '}
                  <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                    Asked Questions
                  </span>
                </>
              )}
            </h1>
            <p className="text-sm leading-relaxed text-slate-200 sm:text-lg">
              {t(
                'Answers to common questions regarding offline study, downloads, quizzes, and curriculum',
                'ስለ ሰንበት ት/ቤት መማሪያ መድረክ፣ ከመስመር ውጭ አጠቃቀም እና ምዝገባ የተለመዱ ጥያቄዎች'
              )}
            </p>

            <div className="relative mx-auto max-w-xl pt-1">
              <label htmlFor={`${baseId}-search`} className="sr-only">
                {t('Search questions', 'ጥያቄዎችን ፈልግ')}
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                id={`${baseId}-search`}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  'Search questions (e.g. offline, download, quizzes, sync)...',
                  'ጥያቄዎችን እዚህ ይፈልጉ (ምሳሌ፡ ከመስመር ውጭ፣ መጽሐፍ፣ ውጤት)...'
                )}
                className="min-h-[48px] w-full rounded-2xl border border-white/20 bg-white py-3 pl-11 pr-4 text-sm text-stone-900 shadow-lg placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              />
            </div>
          </div>
        </section>

        {/* Category chips */}
        <div role="group" aria-label={t('Filter by topic', 'በርዕስ አጣራ')} className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[40px] cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:text-sm ${
                  active
                    ? 'bg-[#0C2340] font-bold text-amber-300 shadow-sm dark:bg-amber-500 dark:text-slate-950'
                    : 'border border-stone-200 bg-white text-stone-700 hover:border-amber-400/60 hover:bg-amber-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {lang === 'am' ? cat.labelAm : cat.labelEn}
              </button>
            );
          })}
        </div>

        {/* Accordion */}
        <section aria-label={t('Questions and answers', 'ጥያቄዎችና መልሶች')} className="space-y-3">
          <p className="sr-only" role="status" aria-live="polite">
            {t(`${filteredItems.length} questions shown`, `${filteredItems.length} ጥያቄዎች ታይተዋል`)}
          </p>

          {filteredItems.length === 0 ? (
            <div className="space-y-2 rounded-3xl border border-stone-200 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <HelpCircle className="mx-auto h-8 w-8 text-stone-300 dark:text-slate-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-stone-700 dark:text-slate-200">
                {t('No matching questions found', 'የተፈለገው ጥያቄ አልተገኘም')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                }}
                className="cursor-pointer text-sm font-bold text-amber-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400"
              >
                {t('Clear filters', 'ሁሉንም አሳይ')}
              </button>
            </div>
          ) : (
            filteredItems.map((item, i) => {
              const isOpen = !!expandedIds[item.id];
              const question = lang === 'am' ? item.questionAm : item.questionEn;
              const answer = lang === 'am' ? item.answerAm : item.answerEn;
              const panelId = `${baseId}-panel-${item.id}`;
              const buttonId = `${baseId}-btn-${item.id}`;

              return (
                <Reveal key={item.id} delayMs={Math.min(i, 4) * 40}>
                  <div
                    className={`overflow-hidden rounded-2xl border bg-white transition dark:bg-slate-900 ${
                      isOpen
                        ? 'border-amber-400/60 shadow-sm dark:border-amber-500/40'
                        : 'border-stone-200 dark:border-slate-800'
                    }`}
                  >
                    <h2 className="m-0">
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(item.id)}
                        className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 dark:hover:bg-slate-800/60 sm:px-5"
                      >
                        <span className="text-sm font-bold leading-snug text-stone-900 dark:text-white sm:text-base">{question}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-stone-500 transition-transform dark:text-slate-400 ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    </h2>
                    {isOpen && (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className="border-t border-stone-100 bg-stone-50/60 px-4 pb-4 pt-3 text-sm leading-relaxed text-stone-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 sm:px-5 sm:pb-5"
                      >
                        {answer}
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })
          )}
        </section>

        <CrossDivider />

        {/* Still need help */}
        <section
          aria-labelledby="faq-help-title"
          className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#0C2340] via-slate-900 to-amber-950 px-5 py-9 text-center text-white sm:px-10 sm:py-12"
        >
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-xl space-y-4">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 id="faq-help-title" className="text-2xl font-black leading-tight sm:text-3xl">
              {t('Still need help?', 'አሁንም እርዳታ ይፈልጋሉ?')}
            </h2>
            <p className="text-sm leading-relaxed text-stone-200 sm:text-base">
              {signedIn
                ? t('Send a message to the support team and we will get back to you.', 'ለድጋፍ ቡድኑ መልእክት ይላኩ፤ እንመልስልዎታለን።')
                : t('Sign in to contact the support team.', 'የድጋፍ ቡድኑን ለማነጋገር ይግቡ።')}
            </p>
            <Link
              href={signedIn ? '/support' : '/login'}
              className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:text-base"
            >
              {signedIn ? t('Contact support', 'ድጋፍ ያነጋግሩ') : t('Sign in', 'ግባ')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <p className="text-xs text-stone-300">
              <Link
                href="/about"
                className="rounded font-semibold text-amber-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {t('Learn more about the platform', 'ስለ መድረኩ ተጨማሪ ይወቁ')}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
