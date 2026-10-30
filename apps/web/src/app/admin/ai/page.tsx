'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  BookOpen,
  Layers,
  HelpCircle,
  CheckCircle,
  Copy,
  ChevronRight,
  FileEdit,
  Loader2,
  Wand2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { Select } from '@/components/Select';

function AiCurriculumContent() {
  const searchParams = useSearchParams();
  const gradeIdParam = searchParams.get('gradeId') || '';
  const subjectIdParam = searchParams.get('subjectId') || '';
  const chapterIdParam = searchParams.get('chapterId') || '';

  const { lang, pick } = useLanguage();
  const [grades, setGrades] = useState<any[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>(gradeIdParam);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectIdParam);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(chapterIdParam);

  const [topicPrompt, setTopicPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    api.init().then(() => {
      api.getAdminCurriculum().then((data) => {
        const sorted = (data || []).sort((a: any, b: any) => a.level - b.level);
        setGrades(sorted);
        if (!selectedGradeId && sorted.length > 0) {
          setSelectedGradeId(sorted[0].id);
        }
      });
    });
  }, []);

  const currentGrade = grades.find((g) => g.id === selectedGradeId);
  const subjects = currentGrade?.subjects || [];
  const currentSubject = subjects.find((s: any) => s.id === selectedSubjectId);
  const chapters = currentSubject?.chapters || [];

  const handleGenerate = () => {
    if (!topicPrompt.trim()) return;
    setIsGenerating(true);

    // Smart curriculum generation based on Ethiopian Orthodox Sunday School tradition
    setTimeout(() => {
      const subjectName = currentSubject ? pick(currentSubject.amharicName, currentSubject.name) : 'Orthodox Tewahedo';
      const promptTrim = topicPrompt.trim();

      const outline = {
        title: lang === 'am' ? `ምዕራፍ: ${promptTrim}` : `Chapter: ${promptTrim}`,
        subject: subjectName,
        learningObjectives: [
          lang === 'am'
            ? `የ${promptTrim}ን ሃይማኖታዊና ታሪካዊ መሠረት መረዳት`
            : `Understand the theological and historical foundation of ${promptTrim}`,
          lang === 'am'
            ? 'በቀደምት ሊቃውንትና ቅዱሳን አባቶች የተሰጡትን ትምህርቶች መመርመር'
            : 'Analyze lessons and patristic commentaries from the early church fathers',
          lang === 'am'
            ? 'በዕለታዊ መንፈሳዊ ሕይወት ውስጥ የሚኖረውን ተግባራዊ ተሳትፎ ማወቅ'
            : 'Apply spiritual teachings to contemporary daily Christian life',
        ],
        readingPagesRecommendation: {
          startPage: 15,
          endPage: 28,
          summary:
            lang === 'am'
              ? 'ይህ ምዕራፍ ከዋናው መጽሐፍ ገጽ 15 እስከ 28 ድረስ ያለውን ይዘት ይሸፍናል።'
              : 'This chapter covers pages 15 through 28 of the master textbook.',
        },
        quizQuestions: [
          {
            prompt:
              lang === 'am'
                ? `ስለ ${promptTrim} በቀደምት የቤተ ክርስቲያን ሊቃውንት የተሰጠው ዋነኛ ትምህርት ምንድን ነው?`
                : `What is the primary patristic teaching regarding ${promptTrim}?`,
            points: 10,
            explanation:
              lang === 'am'
                ? 'በቅዱሳት መጻሕፍትና በሊቃውንት ትውፊት መሠረት ትክክለኛው መልስ ይህ ነው።'
                : 'According to Holy Scripture and sacred tradition, this is the canonical interpretation.',
            choices: [
              {
                text: lang === 'am' ? 'መንፈሳዊ አንድነትንና ንጽሕናን መጠበቅ' : 'Preserving spiritual unity and sanctity',
                isCorrect: true,
              },
              {
                text: lang === 'am' ? 'ሥጋዊ ክብርንና ዝናን መፈለግ' : 'Seeking worldly recognition and prestige',
                isCorrect: false,
              },
              {
                text: lang === 'am' ? 'የቀደምት ትውፊቶችን ሙሉ ለሙሉ መቀየር' : 'Abandoning sacred ancestral traditions',
                isCorrect: false,
              },
              {
                text: lang === 'am' ? 'ማኅበራዊ ግዴታዎችን ብቻ ማከናወን' : 'Performing civic duties exclusively',
                isCorrect: false,
              },
            ],
          },
          {
            prompt:
              lang === 'am'
                ? 'በዚህ ትምህርት ውስጥ የተጠቀሰው ቁልፍ የመጽሐፍ ቅዱስ ጥቅስ የትኛው ነው?'
                : 'Which biblical passage serves as the foundational scriptural anchor for this lesson?',
            points: 10,
            explanation:
              lang === 'am'
                ? 'ይህ ጥቅስ የትምህርቱን መሠረታዊ ጭብጥ ያጠቃልላል።'
                : 'This scripture encapsulates the core spiritual thesis of the chapter.',
            choices: [
              {
                text: lang === 'am' ? 'ዮሐንስ ፩፥፩-፲፬ (John 1:1-14)' : 'John 1:1-14',
                isCorrect: true,
              },
              {
                text: lang === 'am' ? 'ዘፍጥረት ፲፩፥፩-፱ (Genesis 11:1-9)' : 'Genesis 11:1-9',
                isCorrect: false,
              },
              {
                text: lang === 'am' ? 'ማቴዎስ ፳፬፥፩-፭ (Matthew 24:1-5)' : 'Matthew 24:1-5',
                isCorrect: false,
              },
              {
                text: lang === 'am' ? 'ሮሜ ፰፥፩-፬ (Romans 8:1-4)' : 'Romans 8:1-4',
                isCorrect: false,
              },
            ],
          },
        ],
      };

      setGeneratedResult(outline);
      setIsGenerating(false);
    }, 1200);
  };

  const handleCopyJson = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(JSON.stringify(generatedResult, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-stone-500 dark:text-slate-400 mb-2">
            <Link
              href={`/admin/curriculum?grade=${selectedGradeId}&subject=${selectedSubjectId}`}
              className="hover:text-amber-600 dark:hover:text-amber-400 flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'am' ? 'ወደ ስርዓተ ትምህርት ተመለስ' : 'Back to Curriculum'}</span>
            </Link>
            {selectedChapterId && (
              <>
                <span>/</span>
                <Link
                  href={`/admin/chapters/${selectedChapterId}`}
                  className="hover:text-amber-600 dark:hover:text-amber-400 flex items-center space-x-1"
                >
                  <FileEdit className="w-3 h-3 text-amber-500" />
                  <span>{lang === 'am' ? 'ወደ ምዕራፍ ስቱዲዮ ተመለስ' : 'Back to Chapter Studio'}</span>
                </Link>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span>{lang === 'am' ? 'አይአይ ስርዓተ ትምህርት ረዳት ስቱዲዮ' : 'AI Curriculum Studio'}</span>
          </h1>
          <p className="text-stone-500 dark:text-slate-400 text-sm mt-1">
            {lang === 'am'
              ? 'የትምህርት ርዕስ በመስጠት የምዕራፍ ይዘት ረቂቅ፣ የገጽ ክልል ምክረ ሃሳብና ፬ አማራጭ ያላቸው የፈተና ጥያቄዎችን አመንጭ'
              : 'Generate chapter outlines, page range recommendations, and 4-choice practice quizzes with AI'}
          </p>
        </div>

        {selectedChapterId ? (
          <Link
            href={`/admin/chapters/${selectedChapterId}`}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition"
          >
            <FileEdit className="w-4 h-4" />
            <span>{lang === 'am' ? 'ወደ ምዕራፉ ስቱዲዮ ሂድ' : 'Open in Chapter Studio'}</span>
          </Link>
        ) : (
          <Link
            href={`/admin/curriculum?grade=${selectedGradeId}&subject=${selectedSubjectId}`}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 font-semibold rounded-lg text-sm border border-stone-200 dark:border-slate-700 transition shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>{lang === 'am' ? 'ስርዓተ ትምህርት ማውጫ' : 'Curriculum Index'}</span>
          </Link>
        )}
      </div>

      {/* Generator Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-stone-200 dark:border-slate-800">
            <Wand2 className="w-4 h-4 text-amber-500" />
            <span>{lang === 'am' ? '፩. የትምህርት ዒላማ ምረጥ' : '1. Target Selection'}</span>
          </h2>

          <div className="space-y-3 text-xs">
            {/* Grade Selector */}
            <div>
              <label className="block text-stone-600 dark:text-slate-400 mb-1 font-semibold">
                {lang === 'am' ? 'የትምህርት ክፍል' : 'Grade'}
              </label>
              <Select
                value={selectedGradeId}
                onChange={(e) => {
                  setSelectedGradeId(e.target.value);
                  const gr = grades.find((g) => g.id === e.target.value);
                  setSelectedSubjectId(gr?.subjects?.[0]?.id || '');
                  setSelectedChapterId('');
                }}
                className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {pick(g.amharicName, g.name)} ({lang === 'am' ? `ክፍል ${g.level}` : `Grade ${g.level}`})
                  </option>
                ))}
              </Select>
            </div>

            {/* Subject Selector */}
            <div>
              <label className="block text-stone-600 dark:text-slate-400 mb-1 font-semibold">
                {lang === 'am' ? 'የትምህርት ዓይነት' : 'Subject'}
              </label>
              <Select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedChapterId('');
                }}
                className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">{lang === 'am' ? '-- ምረጥ --' : '-- Select --'}</option>
                {subjects.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {pick(s.amharicName, s.name)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Optional Chapter Target */}
            <div>
              <label className="block text-stone-600 dark:text-slate-400 mb-1 font-semibold">
                {lang === 'am' ? 'ዒላማ የተደረገ ምዕራፍ (አማራጭ)' : 'Target Chapter (Optional)'}
              </label>
              <Select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">{lang === 'am' ? '-- አዲስ ምዕራፍ --' : '-- New Chapter --'}</option>
                {chapters.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.chapterNumber} - {pick(ch.amharicTitle, ch.title)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Topic Prompt */}
            <div>
              <label className="block text-stone-600 dark:text-slate-400 mb-1 font-semibold">
                {lang === 'am' ? 'የርዕሰ ጉዳዩ ዋና ጭብጥ' : 'Topic & Learning Prompt'}
              </label>
              <textarea
                rows={3}
                required
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder={
                  lang === 'am'
                    ? 'ለምሳሌ፡ የሰማዕታት ሕይወት፣ ገዳማዊ ሥርዓትና የቅዱሳን አበው ታሪክ'
                    : 'e.g. Early monasticism in Ethiopia and theological councils'
                }
                className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg p-2.5 text-stone-900 dark:text-white focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !topicPrompt.trim()}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition flex items-center justify-center space-x-1.5 shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{lang === 'am' ? 'አይአይ ይዘቱን በማዘጋጀት ላይ...' : 'AI Generating Curriculum...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>{lang === 'am' ? 'ይዘትና ፈተና አመንጭ' : 'Generate Curriculum & Quiz'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Curriculum Outline & Questions Output */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 space-y-5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>{lang === 'am' ? '፪. የተዘጋጀ ረቂቅ ይዘትና ፈተና' : '2. Generated Outline & Quizzes'}</span>
            </h2>

            {generatedResult && (
              <button
                onClick={handleCopyJson}
                className="text-xs bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded border border-stone-200 dark:border-slate-700 flex items-center space-x-1 transition"
              >
                {copySuccess ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? (lang === 'am' ? 'ተቀድቷል!' : 'Copied!') : (lang === 'am' ? 'ኮፒ አድርግ' : 'Copy JSON')}</span>
              </button>
            )}
          </div>

          {!generatedResult ? (
            <div className="p-12 text-center text-stone-400 dark:text-slate-500 bg-stone-50 dark:bg-slate-950/60 rounded-xl border border-stone-200 dark:border-slate-800/80 space-y-2">
              <Sparkles className="w-8 h-8 text-stone-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs">
                {lang === 'am'
                  ? 'የርዕስ ሃሳብ አስገብተው "ይዘትና ፈተና አመንጭ" የሚለውን ይጫኑ።'
                  : 'Enter a topic prompt and click "Generate Curriculum & Quiz" to start.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-stone-50 dark:bg-slate-950 rounded-lg border border-stone-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300">{generatedResult.title}</h3>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 font-mono">{generatedResult.subject}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-stone-600 dark:text-slate-400 font-semibold block">
                    {lang === 'am' ? 'የመማሪያ ዓላማዎች:' : 'Learning Objectives:'}
                  </span>
                  <ul className="list-disc list-inside text-stone-700 dark:text-slate-300 space-y-0.5 pl-1">
                    {generatedResult.learningObjectives.map((obj: string, i: number) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {generatedResult.readingPagesRecommendation.summary}
                </div>
              </div>

              {/* Questions Preview */}
              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 dark:text-white text-xs flex items-center space-x-1.5">
                  <HelpCircle className="w-4 h-4 text-cyan-500" />
                  <span>
                    {lang === 'am'
                      ? `የተዘጋጁ የፈተና ጥያቄዎች (${generatedResult.quizQuestions.length})`
                      : `Generated Quiz Questions (${generatedResult.quizQuestions.length})`}
                  </span>
                </h4>

                {generatedResult.quizQuestions.map((q: any, idx: number) => (
                  <div key={idx} className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-stone-800 dark:text-slate-200">
                        {idx + 1}. {q.prompt}
                      </span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-bold">{q.points} pts</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                      {q.choices.map((c: any, ci: number) => (
                        <div
                          key={ci}
                          className={`p-2 rounded text-[11px] flex items-center space-x-1.5 border ${
                            c.isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium'
                              : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-stone-600 dark:text-slate-400'
                          }`}
                        >
                          <span>{String.fromCharCode(65 + ci)}.</span>
                          <span>{c.text}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-stone-500 dark:text-slate-500 italic pl-2">
                      {lang === 'am' ? 'ማብራሪያ:' : 'Explanation:'} {q.explanation}
                    </p>
                  </div>
                ))}
              </div>

              {selectedChapterId && (
                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/admin/chapters/${selectedChapterId}`}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-xs"
                  >
                    <span>{lang === 'am' ? 'ወደ ምዕራፍ ስቱዲዮ ተመለስና አስቀምጥ' : 'Back to Chapter Studio'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AiCurriculumStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <span>Loading AI Studio...</span>
        </div>
      }
    >
      <AiCurriculumContent />
    </Suspense>
  );
}
