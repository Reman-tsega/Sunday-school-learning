'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface FAQItem {
  id: string;
  category: 'offline' | 'quizzes' | 'enrollment' | 'textbooks' | 'sync';
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
      'We ask for your Full Name, Email, Password, Age, Residence Address, and desired Grades to enroll. You may optionally provide your Christian/Baptismal name, Phone number, and Sunday School name.',
    answerAm:
      'ሙሉ ስም፣ ኢሜይል፣ የይለፍ ቃል፣ ዕድሜ፣ የመኖሪያ አድራሻ እና የሚማሩባቸው ክፍሎች ይጠየቃሉ። በተጨማሪም የክርስትና ስም፣ ስልክ ቁጥር እና የሰንበት ት/ቤት ወይም የአጥቢያ ቤተክርስቲያን ስም እንደ አማራጭ ማስገባት ይችላሉ።',
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
];

export default function FAQPage() {
  const { lang } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({ '1': true, '2': true });

  const toggleItem = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredItems = FAQ_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.questionEn.toLowerCase().includes(query) ||
      item.questionAm.toLowerCase().includes(query) ||
      item.answerEn.toLowerCase().includes(query) ||
      item.answerAm.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white">
            {lang === 'am' ? 'ተደጋጋሚ ጥያቄዎች እና መልሶች' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 max-w-lg mx-auto">
            {lang === 'am'
              ? 'ስለ ሰንበት ት/ቤት መማሪያ መድረክ፣ ከመስመር ውጭ አጠቃቀም እና ምዝገባ የተለመዱ ጥያቄዎች'
              : 'Answers to common questions regarding offline study, downloads, quizzes, and curriculum'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto">
          <Search className="w-4 h-4 text-stone-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'am'
                ? 'ጥያቄዎችን እዚህ ይፈልጉ (ምሳሌ፡ ከመስመር ውጭ፣ መጽሐፍ፣ ውጤት)...'
                : 'Search questions (e.g. offline, download, quizzes, sync)...'
            }
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: 'all', labelEn: 'All Questions', labelAm: 'ሁሉም ጥያቄዎች' },
            { id: 'offline', labelEn: 'Offline & Downloads', labelAm: 'ከመስመር ውጭ' },
            { id: 'textbooks', labelEn: 'Textbooks', labelAm: 'መጻሕፍት' },
            { id: 'quizzes', labelEn: 'Quizzes & Grading', labelAm: 'ፈተናዎች' },
            { id: 'enrollment', labelEn: 'Grades & Enrollment', labelAm: 'የክፍል ምዝገባ' },
            { id: 'sync', labelEn: 'Sync & Data', labelAm: 'ማመሳሰል' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-800 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              {lang === 'am' ? cat.labelAm : cat.labelEn}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-stone-400 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto text-stone-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-stone-600 dark:text-slate-300">
                {lang === 'am' ? 'የተፈለገው ጥያቄ አልተገኘም' : 'No matching questions found'}
              </p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                {lang === 'am' ? 'ሁሉንም አሳይ' : 'Clear filters'}
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isOpen = !!expandedIds[item.id];
              const question = lang === 'am' ? item.questionAm : item.questionEn;
              const answer = lang === 'am' ? item.answerAm : item.answerEn;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white leading-snug">
                      {question}
                    </span>
                    <div className="p-1 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 text-xs text-stone-600 dark:text-slate-300 leading-relaxed border-t border-stone-100 dark:border-slate-850 bg-stone-50/50 dark:bg-slate-950/50">
                      {answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Need More Help Box */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                {lang === 'am' ? 'ሌላ ተጨማሪ ጥያቄ አለዎት?' : 'Have more questions?'}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'ስለ መድረኩ የበለጠ ለመረዳት የመድረኩን መረጃ ገጽ ይመልከቱ'
                  : 'Learn more about the platform architecture and ecclesiastical mission'}
              </p>
            </div>
          </div>

          <Link
            href="/about"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-xl text-xs transition shrink-0"
          >
            {lang === 'am' ? 'ስለ መድረኩ ይመልከቱ' : 'View About Page'}
          </Link>
        </div>
      </div>
    </div>
  );
}
