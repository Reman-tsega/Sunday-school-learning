'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  HelpCircle,
  Link2,
  Download,
  ArrowLeft,
  Loader2,
  FileText,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  X,
  Lock,
  GraduationCap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { downloadManager } from '@/lib/download-manager';
import { syncManager } from '@/lib/sync-manager';
import {
  getOfflinePackage,
  getStudentProgress,
  saveStudentProgress,
  type StoredPackage,
} from '@/lib/offline-db';
import { PdfViewer } from '@/components/PdfViewer';
import { PracticeQuizPlayer } from '@/components/PracticeQuizPlayer';
import { PracticeQuestionList } from '@/components/PracticeQuestionList';
import { OfflineBadge } from '@/components/OfflineBadge';
import { useLanguage } from '@/lib/language-context';
import type { LearningPackageManifest, PracticeQuestionDto } from '@eotc/shared';

type ActiveTab = 'textbook' | 'drills' | 'quiz' | 'references';

export default function ChapterStudyPage() {
  const params = useParams();
  const router = useRouter();
  const { lang, pick } = useLanguage();
  const chapterId = params.chapterId as string;

  const [manifest, setManifest] = useState<LearningPackageManifest | null>(null);
  const [offlinePkg, setOfflinePkg] = useState<StoredPackage | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('textbook');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');

  // Skippable download prompt modal state
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Chapter completion state
  const [isCompleted, setIsCompleted] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Formative Practice Questions (Drills)
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestionDto[]>([]);
  const [loadingDrills, setLoadingDrills] = useState<boolean>(false);

  // Enrollment barrier state
  const [isRegistrationRequired, setIsRegistrationRequired] = useState(false);
  const [isEnrollmentRequired, setIsEnrollmentRequired] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (
        tabParam === 'quiz' ||
        tabParam === 'references' ||
        tabParam === 'textbook' ||
        tabParam === 'drills'
      ) {
        setActiveTab(tabParam as ActiveTab);
      }
    }
  }, []);

  const checkCompletion = async () => {
    try {
      const progress = await getStudentProgress(chapterId);
      if (progress?.isCompleted) {
        setIsCompleted(true);
        return;
      }
      // If logged in and online, pull server progress
      if (api.getUser() && typeof navigator !== 'undefined' && navigator.onLine) {
        await syncManager.pullServerProgress().catch(() => {});
        const updated = await getStudentProgress(chapterId);
        if (updated?.isCompleted) {
          setIsCompleted(true);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleToggleCompletion = async () => {
    const nextCompleted = !isCompleted;
    setIsCompleted(nextCompleted);
    if (nextCompleted) {
      setBannerDismissed(false);
    }
    const currentP = await getStudentProgress(chapterId);
    await saveStudentProgress({
      chapterId,
      isCompleted: nextCompleted,
      lastReadPage: currentP?.lastReadPage || 1,
      lastStudiedAt: new Date().toISOString(),
      syncState: 'PENDING',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eotc:progress-updated', {
          detail: { chapterId, isCompleted: nextCompleted },
        })
      );
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncManager.triggerSync().catch(() => {});
    }
  };

  useEffect(() => {
    loadChapter();
    checkCompletion();

    const handleProgressUpdate = (e: any) => {
      if (e.detail?.chapterId === chapterId && e.detail?.isCompleted) {
        setIsCompleted(true);
      }
    };

    window.addEventListener('eotc:progress-updated', handleProgressUpdate);
    return () => {
      window.removeEventListener('eotc:progress-updated', handleProgressUpdate);
    };
  }, [chapterId]);

  const loadChapter = async () => {
    setLoading(true);
    try {
      await api.init();
      // 1. Check local IndexedDB
      const local = await getOfflinePackage(chapterId);
      if (local) {
        setOfflinePkg(local);
        setManifest(local.manifest);
      }

      // 2. Try fetching from network if manifest not present or online
      let activeManifest = local?.manifest;
      if (!local || local.downloadStatus !== 'AVAILABLE_OFFLINE') {
        activeManifest = await api.getPackageManifest(chapterId);
        setManifest(activeManifest);

        // Check if student dismissed download prompt permanently
        const hidePrompt = localStorage.getItem('eotc_hide_dl_prompt') === 'true';
        if (!hidePrompt && (!local || local.downloadStatus !== 'AVAILABLE_OFFLINE')) {
          setShowDownloadPrompt(true);
        }
      }

      // 3. Verify student enrollment: to see other grade courses, they must enroll first!
      const currentUser = api.getUser();
      if (!currentUser) {
        setIsRegistrationRequired(true);
      } else if (currentUser.role === 'STUDENT' && activeManifest) {
        const enrollments = await api.getStudentEnrollments().catch(() => []);
        const enrolledGradeIds = enrollments.map((e) => e.gradeId);
        const isEnrolled =
          (activeManifest.gradeId && enrolledGradeIds.includes(activeManifest.gradeId)) ||
          enrollments.some((e) => e.gradeLevel === activeManifest.gradeLevel) ||
          enrolledGradeIds.includes(`grade-level-${activeManifest.gradeLevel}`) ||
          (currentUser.enrolledGradeIds && (
            (activeManifest.gradeId && currentUser.enrolledGradeIds.includes(activeManifest.gradeId)) ||
            currentUser.enrolledGradeIds.includes(`grade-level-${activeManifest.gradeLevel}`)
          ));

        if (!isEnrolled) {
          setIsEnrollmentRequired(true);
        }
      }

      // 4. Fetch approved practice drill questions for self-study
      setLoadingDrills(true);
      try {
        const drills = await api.getChapterPracticeQuestions(chapterId);
        setPracticeQuestions(drills || []);
      } catch (drillErr) {
        console.error('Failed to load practice questions:', drillErr);
      } finally {
        setLoadingDrills(false);
      }
    } catch (err) {
      console.error('Failed to load chapter manifest:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollAndContinue = async () => {
    if (!manifest) return;
    setEnrolling(true);
    try {
      let targetGradeId = manifest.gradeId;
      if (!targetGradeId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const curriculum = await api.getCurriculum().catch(() => []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const found = curriculum.find((g: any) => g.level === manifest.gradeLevel);
        targetGradeId = found?.id || `grade-level-${manifest.gradeLevel}`;
      }
      if (targetGradeId) {
        await api.enrollStudentGrades([targetGradeId]);
        setIsEnrollmentRequired(false);
        await loadChapter();
      }
    } catch (err: any) {
      alert(err.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handleDownload = async () => {
    if (!manifest) return;
    setDownloading(true);
    setDownloadProgress(lang === 'am' ? 'በማውረድ ላይ...' : 'Downloading...');
    setShowDownloadPrompt(false);

    try {
      const stored = await downloadManager.downloadPackage(manifest, (p) => {
        setDownloadProgress(`${p.phase} (${p.progressPercent}%)`);
      });
      setOfflinePkg(stored);
    } catch (err) {
      console.error('Download failed:', err);
      alert(lang === 'am' ? 'ማውረድ አልተሳካም' : 'Download failed');
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  };

  const handleSkipDownloadPrompt = () => {
    if (dontAskAgain) {
      localStorage.setItem('eotc_hide_dl_prompt', 'true');
    }
    setShowDownloadPrompt(false);
  };

  const openReferenceBlob = (ref: any) => {
    const blob = offlinePkg?.referenceBlobs?.[ref.id];
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename with appropriate extension
      const filename = ref.title.includes('.') ? ref.title : `${ref.title}.pdf`;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getDocTypeBadge = (ref: any) => {
    const title = (ref.title || '').toLowerCase();
    const url = (ref.downloadableDocUrl || ref.url || '').toLowerCase();

    if (title.endsWith('.ppt') || title.endsWith('.pptx') || url.includes('.ppt')) {
      return (
        <span className="text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded">
          PPT / PPTX
        </span>
      );
    }
    if (title.endsWith('.doc') || title.endsWith('.docx') || url.includes('.doc')) {
      return (
        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded">
          DOC / DOCX
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
        PDF
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
        <p>{lang === 'am' ? 'የትምህርት መረጃውን በማዘጋጀት ላይ...' : 'Loading chapter content...'}</p>
      </div>
    );
  }

  if (isRegistrationRequired) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <GraduationCap className="w-8 h-8" />
          </div>
          <span className="text-xs uppercase tracking-wider font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 inline-block">
            {lang === 'am' ? 'የተማሪ ምዝገባ ያስፈልጋል' : 'Registration Required'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            {lang === 'am' ? 'እባክዎ መጀመሪያ ይመዝገቡ' : 'Please Register First'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            {lang === 'am'
              ? 'ይህንን ምዕራፍ ለማጥናት፣ መጽሐፉን ለማንበብ፣ ፈተናዎችን ለመውሰድ እና ማጣቀሻዎችን ለመመልከት እባክዎ መጀመሪያ እንደ ተማሪ ይመዝገቡ። ምዝገባው 100% ነጻ ነው!'
              : 'To study this chapter, read clamped textbooks, take practice quizzes, and access church references, please create a student account. Registration is 100% free and takes less than a minute!'}
          </p>
          <div className="pt-2 space-y-2">
            <button
              onClick={() => router.push(`/login?mode=register&redirect=/chapters/${chapterId}`)}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>{lang === 'am' ? 'አሁን በነጻ ይመዝገቡ' : 'Register as Student Now'}</span>
            </button>
            <button
              onClick={() => router.push(`/login?redirect=/chapters/${chapterId}`)}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              {lang === 'am' ? 'መለያ አለዎት? ይግቡ' : 'Already have an account? Sign In'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2 text-stone-400 hover:text-stone-600 text-xs transition cursor-pointer"
            >
              {lang === 'am' ? 'ወደ ስርዓተ ትምህርት ማውጫ ተመለስ' : 'Return to Curriculum Catalog'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEnrollmentRequired && manifest) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-stone-200 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-stone-900">
            {lang === 'am' ? 'የትምህርት ክፍል ምዝገባ ያስፈልጋል' : 'Enrollment Required'}
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            {lang === 'am'
              ? `የ«${manifest.gradeName}» ትምህርቶችን ለመከታተል መጀመሪያ በክፍሉ መመዝገብ አለብዎት። በአንድ ጠቅታ በመመዝገብ ትምህርቱን መቀጠል ይችላሉ።`
              : `To study this chapter and access course material in ${manifest.gradeName}, you must enroll in this grade first.`}
          </p>
          <div className="pt-2 space-y-2">
            <button
              onClick={handleEnrollAndContinue}
              disabled={enrolling}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {enrolling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GraduationCap className="w-4 h-4" />
              )}
              <span>
                {lang === 'am'
                  ? `በ${manifest.gradeName} አሁን ተመዝገብ`
                  : `Enroll in ${manifest.gradeName} Now`}
              </span>
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs transition"
            >
              {lang === 'am' ? 'ወደ መማሪያ ክፍሎቼ ተመለስ' : 'Return to My Grades'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-stone-200">
        <p className="text-stone-700 font-semibold mb-4">
          {lang === 'am' ? 'የትምህርት ክፍሉ አልተገኘም ወይም አልታተመም።' : 'Chapter not found or not published.'}
        </p>
        <Link href="/" className="px-4 py-2 bg-eotc-navy text-white rounded-lg text-sm">
          {lang === 'am' ? 'ወደ ማውጫ ተመለስ' : 'Back to Curriculum'}
        </Link>
      </div>
    );
  }

  const isDownloaded = offlinePkg?.downloadStatus === 'AVAILABLE_OFFLINE';

  return (
    <div className="space-y-6">
      {/* Skippable Download Prompt Modal */}
      {showDownloadPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">
                    {lang === 'am' ? 'ከመስመር ውጭ ማውረድ ይፈልጋሉ?' : 'Download for Offline Study?'}
                  </h3>
                  <span className="text-xs text-stone-500">
                    {pick(manifest.amharicChapterTitle, manifest.chapterTitle)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSkipDownloadPrompt}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {lang === 'am'
                ? 'ይህን ምዕራፍ አሁን በማውረድ ያለ ኢንተርኔት በየትኛውም ቦታና ሰዓት ማንበብና የልምምድ ፈተና መውሰድ ይችላሉ።'
                : 'Downloading this chapter allows you to read clamped pages and practice quizzes completely offline without internet.'}
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="dontAsk"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="dontAsk" className="text-xs text-stone-500 cursor-pointer">
                {lang === 'am' ? 'ዳግመኛ አታሳየኝ' : "Don't ask again on this device"}
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-stone-100">
              <button
                onClick={handleSkipDownloadPrompt}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              >
                {lang === 'am' ? 'በመስመር ላይ ቀጥል (ዝለል)' : 'Continue Online (Skip)'}
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow transition flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'am' ? 'አሁን አውርድ' : 'Download Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-stone-200">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-stone-500 hover:text-amber-700 flex items-center space-x-1 transition cursor-pointer py-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'am' ? 'ወደ ማውጫ ተመለስ' : 'Back to Curriculum'}</span>
          </button>

          {/* Right Header Status / Download Button */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Mark as Completed / Completed Toggle Button */}
            <button
              onClick={handleToggleCompletion}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition cursor-pointer ${
                isCompleted
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
              }`}
              title={
                isCompleted
                  ? lang === 'am'
                    ? 'ትምህርቱን እንዳጠናቀቁ ተመዝግቧል (ዳግም ለመቀየር ይጫኑ)'
                    : 'Marked as Completed (Click to toggle)'
                  : lang === 'am'
                  ? 'ትምህርቱን አጠናቅቅ'
                  : 'Mark Chapter Completed'
              }
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isCompleted
                  ? lang === 'am'
                    ? 'ተጠናቋል'
                    : 'Completed'
                  : lang === 'am'
                  ? 'ትምህርቱን አጠናቅቅ'
                  : 'Mark Completed'}
              </span>
            </button>

            {!isDownloaded ? (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{downloadProgress}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'am' ? 'ከመስመር ውጭ አውርድ' : 'Download Offline'}</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md font-mono">
                {Math.round(manifest.totalSizeBytes / 1024)} KB
              </span>
            )}
          </div>
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
          <span className="text-[11px] sm:text-xs font-bold text-amber-800 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
            {lang === 'am' ? `ክፍል ${manifest.gradeLevel}` : `Grade ${manifest.gradeLevel}`} · {pick(manifest.amharicSubjectName, manifest.subjectName)}
          </span>
          <OfflineBadge status={offlinePkg?.downloadStatus ?? 'NOT_DOWNLOADED'} />
          {isCompleted && (
            <span className="text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{lang === 'am' ? 'ተጠናቋል' : 'Completed'}</span>
            </span>
          )}
        </div>

        {/* Chapter Title */}
        <h1 className="text-lg sm:text-2xl font-black text-stone-900 leading-tight">
          {pick(manifest.amharicChapterTitle, manifest.chapterTitle)}
        </h1>

        {/* Integrated Chapter Completion Celebratory Strip */}
        {isCompleted && !bannerDismissed && (
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2.5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-amber-50/40 p-2.5 rounded-xl border border-emerald-200/70 transition animate-in fade-in">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                ✓
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-950 flex items-center space-x-1 truncate">
                  <span>{lang === 'am' ? 'እንኳን ደስ አለዎት! ምዕራፉ ተጠናቋል።' : 'Congratulations! Chapter Completed.'}</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                </p>
                <p className="text-[11px] text-emerald-700 truncate hidden xs:block">
                  {lang === 'am'
                    ? 'ትምህርቱንና ፈተናውን አጠናቀዋል። ወደ ቀጣዩ መቀጠል ይችላሉ።'
                    : 'You passed the requirements. Proceed to the next lesson or review anytime!'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition shrink-0"
              title={lang === 'am' ? 'ዝጋ' : 'Dismiss'}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Responsive Segmented Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 sm:flex sm:space-x-2 border-b border-stone-200 bg-stone-100/70 p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab('textbook')}
          className={`flex items-center justify-center space-x-1.5 py-2 px-1.5 sm:px-4 font-bold text-xs sm:text-sm rounded-lg transition min-h-[42px] cursor-pointer ${
            activeTab === 'textbook'
              ? 'bg-white text-amber-900 shadow-xs border border-amber-200/60'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-700" />
          <span className="truncate">{lang === 'am' ? 'መጽሐፍ' : 'Textbook'}</span>
        </button>

        <button
          onClick={() => setActiveTab('drills')}
          className={`flex items-center justify-center space-x-1.5 py-2 px-1.5 sm:px-4 font-bold text-xs sm:text-sm rounded-lg transition min-h-[42px] cursor-pointer ${
            activeTab === 'drills'
              ? 'bg-white text-amber-900 shadow-xs border border-amber-200/60'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-600" />
          <span className="truncate">{lang === 'am' ? 'የልምምድ ጥያቄዎች' : 'Practice Drills'}</span>
          {practiceQuestions.length > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">
              {practiceQuestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center justify-center space-x-1.5 py-2 px-1.5 sm:px-4 font-bold text-xs sm:text-sm rounded-lg transition min-h-[42px] cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-white text-amber-900 shadow-xs border border-amber-200/60'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-700" />
          <span className="truncate">{lang === 'am' ? 'ፈተና' : 'Graded Quiz'}</span>
          {manifest.quizzes.length > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">
              {manifest.quizzes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('references')}
          className={`flex items-center justify-center space-x-1.5 py-2 px-1.5 sm:px-4 font-bold text-xs sm:text-sm rounded-lg transition min-h-[42px] cursor-pointer ${
            activeTab === 'references'
              ? 'bg-white text-amber-900 shadow-xs border border-amber-200/60'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-700" />
          <span className="truncate">{lang === 'am' ? 'ማጣቀሻ' : 'References'}</span>
          {manifest.references.length > 0 && (
            <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-full font-bold">
              {manifest.references.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'drills' && (
          <PracticeQuestionList
            chapterId={manifest.chapterId}
            questions={practiceQuestions}
            loading={loadingDrills}
          />
        )}
        {activeTab === 'textbook' && (
          <PdfViewer
            chapterId={manifest.chapterId}
            textbook={manifest.textbook}
            blob={offlinePkg?.textbookBlob}
            onReadingComplete={() => {
              setIsCompleted(true);
              setBannerDismissed(false);
            }}
            onQuizClick={manifest.quizzes.length > 0 ? () => setActiveTab('quiz') : undefined}
          />
        )}

        {activeTab === 'quiz' && (
          manifest.quizzes.length > 0 ? (
            <PracticeQuizPlayer
              quiz={manifest.quizzes[0]!}
              chapterId={manifest.chapterId}
            />
          ) : (
            <div className="bg-white p-8 rounded-xl text-center text-stone-500 border border-stone-200 space-y-3">
              <p>{lang === 'am' ? 'ለዚህ ምዕራፍ ምንም የልምምድ ፈተና አልተዘጋጀም። መጽሐፉን በማንበብ ትምህርቱን ማጠናቀቅ ይችላሉ።' : 'No practice quiz for this chapter. Completing reading fulfills this chapter.'}</p>
              {!isCompleted && (
                <button
                  onClick={async () => {
                    const { saveStudentProgress } = await import('@/lib/offline-db');
                    await saveStudentProgress({
                      chapterId,
                      isCompleted: true,
                      lastReadPage: 1,
                      lastStudiedAt: new Date().toISOString(),
                    });
                    setIsCompleted(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow"
                >
                  {lang === 'am' ? 'ትምህርቱን አጠናቅቅ' : 'Mark as Completed'}
                </button>
              )}
            </div>
          )
        )}

        {activeTab === 'references' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-800">
              {lang === 'am' ? 'የተፈቀዱ ማጣቀሻዎች' : 'Approved References'}
            </h3>

            {manifest.references.length === 0 ? (
              <p className="text-stone-500 text-sm">
                {lang === 'am' ? 'ምንም የተካተተ ማጣቀሻ የለም።' : 'No references attached to this chapter.'}
              </p>
            ) : (
              <div className="space-y-3">
                {manifest.references.map((ref) => {
                  const hasLocalBlob = !!offlinePkg?.referenceBlobs?.[ref.id];

                  return (
                    <div
                      key={ref.id}
                      className="p-4 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start space-x-3">
                        <FileText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-sm text-stone-900">
                              {pick(ref.amharicTitle, ref.title)}
                            </h4>
                            {getDocTypeBadge(ref)}
                          </div>
                          <span className="text-xs text-stone-500">
                            {ref.isDownloadable
                              ? (lang === 'am'
                                  ? `ከመስመር ውጭ የሚነበብ ሰነድ (${Math.round((ref.downloadableDocSize || 0) / 1024)} KB)`
                                  : `Offline Document (${Math.round((ref.downloadableDocSize || 0) / 1024)} KB)`)
                              : (lang === 'am' ? 'የውጭ ድረ-ገጽ (ኢንተርኔት ያስፈልጋል)' : 'External Link (Requires Internet)')}
                          </span>
                        </div>
                      </div>

                      <div>
                        {ref.isDownloadable ? (
                          hasLocalBlob ? (
                            <button
                              onClick={() => openReferenceBlob(ref)}
                              className="text-xs font-semibold px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            >
                              {lang === 'am' ? 'ክፈት' : 'Open Offline'}
                            </button>
                          ) : (
                            <a
                              href={ref.downloadableDocUrl || ref.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 transition"
                            >
                              {lang === 'am' ? 'አውርድ' : 'Download'}
                            </a>
                          )
                        ) : (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-stone-700 hover:text-amber-700"
                          >
                            <span>{lang === 'am' ? 'ጎብኝ' : 'Visit Link'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
