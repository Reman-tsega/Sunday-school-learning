'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Download,
  CheckCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Search,
  Award,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  PlusCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { downloadManager } from '@/lib/download-manager';
import { syncManager } from '@/lib/sync-manager';
import { getOfflinePackage, getAllStudentProgress } from '@/lib/offline-db';
import { OfflineBadge } from '@/components/OfflineBadge';
import { useLanguage } from '@/lib/language-context';
import type { PackageDownloadStatus, UserProfile } from '@eotc/shared';

interface ChapterItem {
  id: string;
  chapterNumber: number;
  title: string;
  amharicTitle?: string;
  version: number;
  isPublished: boolean;
}

interface SubjectItem {
  id: string;
  name: string;
  amharicName?: string;
  code: string;
  chapters: ChapterItem[];
}

interface GradeItem {
  id: string;
  level: number;
  name: string;
  amharicName?: string;
  subjects: SubjectItem[];
}

export default function CurriculumPage() {
  const router = useRouter();
  const { lang, pick } = useLanguage();
  const [curriculum, setCurriculum] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadStatuses, setDownloadStatuses] = useState<Record<string, PackageDownloadStatus>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [enrolledGradeIds, setEnrolledGradeIds] = useState<string[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [tempEnrollmentIds, setTempEnrollmentIds] = useState<string[]>([]);
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentProgressMap, setStudentProgressMap] = useState<Record<string, boolean>>({});
  const [studyPromptChapter, setStudyPromptChapter] = useState<{ id: string; title: string } | null>(null);
  const [studyPromptDownloading, setStudyPromptDownloading] = useState(false);
  const [studyPromptProgress, setStudyPromptProgress] = useState('');
  const [dontAskDownloadAgain, setDontAskDownloadAgain] = useState(false);
  const [expandedGrades, setExpandedGrades] = useState<Record<number, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Public access gate modal state (prompts guests to register)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedChapterForGate, setSelectedChapterForGate] = useState<{ id: string; title: string } | null>(null);

  const toggleGrade = (level: number) => {
    setExpandedGrades((prev) => ({
      ...prev,
      [level]: prev[level] !== undefined ? !prev[level] : false,
    }));
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId] !== undefined ? !prev[subjectId] : false,
    }));
  };

  const handleToggleAll = (expand: boolean) => {
    const gMap: Record<number, boolean> = {};
    const sMap: Record<string, boolean> = {};
    curriculum.forEach((g) => {
      gMap[g.level] = expand;
      g.subjects?.forEach((s) => {
        sMap[s.id] = expand;
      });
    });
    setExpandedGrades(gMap);
    setExpandedSubjects(sMap);
  };

  useEffect(() => {
    loadCurriculum();

    const unsubscribe = api.onAuthChange((u) => {
      setUser(u);
      if (u?.role === 'ADMIN') {
        router.replace('/admin');
      }
    });

    const handleProgress = async (e: any) => {
      if (e.detail?.chapterId) {
        setStudentProgressMap((prev) => ({
          ...prev,
          [e.detail.chapterId]: !!e.detail.isCompleted,
        }));
      }
      if (e.detail?.pulled) {
        const progressList = await getAllStudentProgress();
        const progMap: Record<string, boolean> = {};
        progressList.forEach((p) => {
          if (p.isCompleted) progMap[p.chapterId] = true;
        });
        setStudentProgressMap(progMap);
      }
    };
    window.addEventListener('eotc:progress-updated', handleProgress);

    return () => {
      unsubscribe();
      window.removeEventListener('eotc:progress-updated', handleProgress);
    };
  }, [router]);

  const loadCurriculum = async () => {
    setLoading(true);
    try {
      await api.init();
      const currentUser = api.getUser();
      setUser(currentUser);
      if (currentUser?.role === 'ADMIN') {
        router.replace('/admin');
        return;
      }
      const data = await api.getCurriculum();

      // Ensure grades have unique IDs and are strictly ascending by level (Grade 1, Grade 2, Grade 3...)
      const sorted = (data || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((g: any, index: number) => ({
          ...g,
          id: g.id || (g.level != null ? `grade-level-${g.level}` : `grade-${index}`),
        }))
        .sort((a: GradeItem, b: GradeItem) => a.level - b.level);
      setCurriculum(sorted);

      // Initialize all grades and subjects as expanded by default
      const gMap: Record<number, boolean> = {};
      const sMap: Record<string, boolean> = {};
      sorted.forEach((g: GradeItem) => {
        gMap[g.level] = true;
        g.subjects?.forEach((s: SubjectItem) => {
          sMap[s.id] = true;
        });
      });
      setExpandedGrades((prev) => (Object.keys(prev).length > 0 ? prev : gMap));
      setExpandedSubjects((prev) => (Object.keys(prev).length > 0 ? prev : sMap));

      await checkDownloadStatuses(sorted);

      // If logged in and online, pull server progress to sync cloud completions
      if (currentUser && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          await syncManager.pullServerProgress();
        } catch {
          // offline or pull failed
        }
      }

      // Load student progress from offline DB
      const progressList = await getAllStudentProgress();
      const progMap: Record<string, boolean> = {};
      progressList.forEach((p) => {
        if (p.isCompleted) progMap[p.chapterId] = true;
      });
      setStudentProgressMap(progMap);

      // Fetch student enrollments if logged in
      if (currentUser) {
        try {
          const enrollments = await api.getStudentEnrollments();
          if (Array.isArray(enrollments) && enrollments.length > 0) {
            const ids = enrollments.map((e) => e.gradeId);
            setEnrolledGradeIds(ids);
          } else if (currentUser.enrolledGradeIds && currentUser.enrolledGradeIds.length > 0) {
            setEnrolledGradeIds(currentUser.enrolledGradeIds);
          }
        } catch {
          if (currentUser.enrolledGradeIds && currentUser.enrolledGradeIds.length > 0) {
            setEnrolledGradeIds(currentUser.enrolledGradeIds);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDownloadStatuses = async (grades: GradeItem[]) => {
    const statuses: Record<string, PackageDownloadStatus> = {};
    for (const g of grades) {
      for (const s of g.subjects || []) {
        for (const c of s.chapters || []) {
          const stored = await getOfflinePackage(c.id);
          statuses[c.id] = stored?.downloadStatus ?? 'NOT_DOWNLOADED';
        }
      }
    }
    setDownloadStatuses(statuses);
  };

  const handleDownload = async (chapterId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is logged in
    if (!api.getUser()) {
      const foundChapter = curriculum
        .flatMap((g) => g.subjects || [])
        .flatMap((s) => s.chapters || [])
        .find((c) => c.id === chapterId);
      setSelectedChapterForGate(
        foundChapter
          ? { id: foundChapter.id, title: pick(foundChapter.amharicTitle, foundChapter.title) }
          : null
      );
      setIsRegisterModalOpen(true);
      return;
    }

    setDownloadingId(chapterId);
    setDownloadStatuses((prev) => ({ ...prev, [chapterId]: 'DOWNLOADING' }));

    try {
      const manifest = await api.getPackageManifest(chapterId);
      await downloadManager.downloadPackage(manifest);
      setDownloadStatuses((prev) => ({ ...prev, [chapterId]: 'AVAILABLE_OFFLINE' }));
    } catch (err) {
      console.error('Download error:', err);
      setDownloadStatuses((prev) => ({ ...prev, [chapterId]: 'FAILED' }));
      alert(lang === 'am' ? 'ማውረድ አልተሳካም። እባክዎ እንደገና ይሞክሩ።' : 'Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStudyClick = (chapter: ChapterItem, e: React.MouseEvent) => {
    e.preventDefault();

    // Gate guest users: trigger registration modal
    if (!api.getUser()) {
      setSelectedChapterForGate({
        id: chapter.id,
        title: pick(chapter.amharicTitle, chapter.title),
      });
      setIsRegisterModalOpen(true);
      return;
    }

    const status = downloadStatuses[chapter.id] || 'NOT_DOWNLOADED';
    const hidePrompt = typeof window !== 'undefined' && localStorage.getItem('eotc_hide_dl_prompt') === 'true';

    if (status === 'AVAILABLE_OFFLINE' || hidePrompt) {
      router.push(`/chapters/${chapter.id}`);
    } else {
      setStudyPromptChapter({
        id: chapter.id,
        title: pick(chapter.amharicTitle, chapter.title),
      });
    }
  };

  const handleQuizClick = (chapter: ChapterItem, e: React.MouseEvent) => {
    e.preventDefault();

    // Gate guest users: trigger registration modal
    if (!api.getUser()) {
      setSelectedChapterForGate({
        id: chapter.id,
        title: pick(chapter.amharicTitle, chapter.title),
      });
      setIsRegisterModalOpen(true);
      return;
    }

    router.push(`/chapters/${chapter.id}?tab=quiz`);
  };

  const handlePromptDownloadAndStudy = async () => {
    if (!studyPromptChapter) return;
    setStudyPromptDownloading(true);
    setStudyPromptProgress(lang === 'am' ? 'በማውረድ ላይ...' : 'Downloading...');

    if (dontAskDownloadAgain && typeof window !== 'undefined') {
      localStorage.setItem('eotc_hide_dl_prompt', 'true');
    }

    try {
      const manifest = await api.getPackageManifest(studyPromptChapter.id);
      await downloadManager.downloadPackage(manifest, (p) => {
        setStudyPromptProgress(`${p.phase} (${p.progressPercent}%)`);
      });
      setDownloadStatuses((prev) => ({ ...prev, [studyPromptChapter.id]: 'AVAILABLE_OFFLINE' }));
      router.push(`/chapters/${studyPromptChapter.id}`);
    } catch (err) {
      console.error('Download before study failed:', err);
      // Fallback: still navigate so student is never stuck
      router.push(`/chapters/${studyPromptChapter.id}`);
    } finally {
      setStudyPromptDownloading(false);
      setStudyPromptChapter(null);
    }
  };

  const handlePromptSkipAndStudy = () => {
    if (!studyPromptChapter) return;
    if (dontAskDownloadAgain && typeof window !== 'undefined') {
      localStorage.setItem('eotc_hide_dl_prompt', 'true');
    }
    const targetId = studyPromptChapter.id;
    setStudyPromptChapter(null);
    router.push(`/chapters/${targetId}`);
  };

  const areAllExpanded =
    curriculum.length > 0 &&
    curriculum.every((g) => expandedGrades[g.level] ?? true);

  const isGradeEnrolled = (g: GradeItem) => {
    return (
      (g.id && enrolledGradeIds.includes(g.id)) ||
      (g.level != null && enrolledGradeIds.includes(`grade-level-${g.level}`)) ||
      (g.level != null && enrolledGradeIds.includes(String(g.level)))
    );
  };

  // Only grades the student has not yet enrolled in
  const unenrolledGrades = curriculum.filter((g) => !isGradeEnrolled(g));

  const handleOpenEnrollModal = () => {
    // When enrolling new grades, selection starts empty
    setTempEnrollmentIds([]);
    setIsEnrollModalOpen(true);
  };

  const handleToggleTempEnroll = (gradeId: string) => {
    if (!gradeId) return;
    setTempEnrollmentIds((prev) =>
      prev.includes(gradeId) ? prev.filter((id) => id !== gradeId) : [...prev, gradeId]
    );
  };

  const handleSaveEnrollments = async () => {
    const validSelection = tempEnrollmentIds.filter((id): id is string => Boolean(id) && typeof id === 'string');
    if (validSelection.length === 0) {
      alert(lang === 'am' ? 'እባክዎ ቢያንስ አንድ አዲስ ክፍል ይምረጡ' : 'Please select at least one new grade to enroll in');
      return;
    }
    setEnrollSaving(true);
    try {
      // Map any synthetic IDs (like grade-level-1) to real DB IDs if present in curriculum
      const targetIds = validSelection.map((id) => {
        const found = curriculum.find(
          (c) => c.id === id || `grade-level-${c.level}` === id || `grade-${c.level}` === id
        );
        return found?.id || id;
      });
      // Backend upserts newly chosen grades and returns complete enrolled list
      const updated = await api.enrollStudentGrades(targetIds);
      const ids = updated.map((e) => e.gradeId);
      setEnrolledGradeIds(ids);
      setIsEnrollModalOpen(false);
      setTempEnrollmentIds([]);
    } catch (err: any) {
      alert(err.message || 'Failed to update enrollments');
    } finally {
      setEnrollSaving(false);
    }
  };

  // Real-time Search & Filter by Subject Topic and Chapter Title
  const q = searchQuery.toLowerCase().trim();
  // For students, strictly show ONLY grades they are enrolled in. To see other grades, they must enroll first.
  const baseCurriculum = user
    ? curriculum.filter((g) => isGradeEnrolled(g))
    : curriculum;

  const filteredCurriculum = (
    selectedGrade === 'all'
      ? baseCurriculum
      : baseCurriculum.filter((g) => g.level === selectedGrade)
  )
    .map((grade) => {
      if (!q) return grade;
      const gradeMatches =
        grade.name?.toLowerCase().includes(q) ||
        grade.amharicName?.toLowerCase().includes(q) ||
        String(grade.level).includes(q);

      const matchingSubjects = (grade.subjects || []).filter((sub) => {
        const subMatches =
          sub.name?.toLowerCase().includes(q) ||
          sub.amharicName?.toLowerCase().includes(q) ||
          sub.code?.toLowerCase().includes(q);

        const chMatches = (sub.chapters || []).some(
          (ch) =>
            ch.title?.toLowerCase().includes(q) ||
            ch.amharicTitle?.toLowerCase().includes(q)
        );

        return subMatches || chMatches;
      });

      if (gradeMatches || matchingSubjects.length > 0) {
        return {
          ...grade,
          subjects: matchingSubjects.length > 0 ? matchingSubjects : grade.subjects,
        };
      }
      return null;
    })
    .filter(Boolean) as GradeItem[];

  if (loading || user?.role === 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
        <p>
          {user?.role === 'ADMIN'
            ? (lang === 'am' ? 'ወደ አስተዳዳሪ ስቱዲዮ በመቀየር ላይ...' : 'Redirecting to Admin Studio...')
            : (lang === 'am' ? 'ሥርዓተ ትምህርቱን በመጫን ላይ...' : 'Loading Curriculum...')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-eotc-navy via-slate-900 to-amber-950 text-white rounded-2xl p-4 sm:p-7 shadow-lg border border-amber-500/20">
        <div className="max-w-2xl">
          <span className="text-[11px] sm:text-xs uppercase tracking-widest text-amber-300 font-semibold flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {lang === 'am' ? 'የሰንበት ትምህርት ቤት አንድነት' : 'EOTC Sunday School Platform'}
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-1">
            {lang === 'am' ? 'ኦርቶዶክሳዊ የትምህርት መድረክ' : 'Orthodox Christian Learning Platform'}
          </h1>
          <p className="mt-1.5 text-stone-300 text-xs sm:text-sm md:text-base leading-relaxed">
            {lang === 'am'
              ? 'መጻሕፍትን፣ የልምምድ ፈተናዎችን እና ማጣቀሻዎችን አንዴ በማውረድ ያለ ኢንተርኔት በየትኛውም ቦታ ይማሩ።'
              : 'Download textbooks, practice quizzes, and references once to study anywhere offline.'}
          </p>
        </div>
      </div>

      {/* Advanced Real-time Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
        <Search className="w-5 h-5 text-stone-400 dark:text-slate-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            lang === 'am'
              ? 'በርዕሰ ጉዳይ፣ በምዕራፍ ርዕስ ወይም በኮድ ይፈልጉ... (ለምሳሌ፡ Church History ወይም HIST)'
              : 'Search by subject topic, chapter title, or code... (e.g. Church History or HIST)'
          }
          className="w-full bg-transparent text-sm text-stone-800 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white px-2.5 py-1 bg-stone-100 dark:bg-slate-800 rounded-lg transition"
          >
            {lang === 'am' ? 'አጥፋ' : 'Clear'}
          </button>
        )}
      </div>

      {/* Student Multi-Grade Enrollment Switcher & Action Bar */}
      {user && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-amber-700 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-950 block">
                {lang === 'am' ? 'የተመዘገብኩባቸው ክፍሎች' : 'My Enrolled Grades'}
              </span>
              <span className="text-stone-600">
                {enrolledGradeIds.length > 0
                  ? (lang === 'am' ? `በ${enrolledGradeIds.length} ክፍሎች ተመዝግበዋል` : `Enrolled in ${enrolledGradeIds.length} grade(s)`)
                  : (lang === 'am' ? 'እስካሁን የተመዘገቡበት ክፍል የለም' : 'Not yet enrolled in any specific grade')}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenEnrollModal}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{lang === 'am' ? 'ተጨማሪ ክፍል ጨምር' : 'Enroll in More Grades'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Grade Selector Navigation: Mobile Dropdown & Desktop Pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-stone-200 dark:border-slate-800">
        <div className="flex items-center space-x-2 shrink-0">
          <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white">
            {lang === 'am' ? 'የትምህርት ክፍሎች' : 'Curriculum Grades'}
          </h2>
        </div>

        {/* 1. Mobile Dropdown (< sm screens) */}
        <div className="sm:hidden w-full flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full appearance-none bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-900 dark:text-white text-xs font-bold py-2.5 pl-3 pr-8 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              aria-label={lang === 'am' ? 'ክፍል ይምረጡ' : 'Select Grade'}
            >
              <option value="all">
                {lang === 'am' ? '📚 ሁሉም ክፍሎች (All Grades)' : '📚 All Grades'}
              </option>
              {baseCurriculum.map((g) => (
                <option key={g.level} value={g.level}>
                  {lang === 'am' ? (g.amharicName || `ክፍል ${g.level}`) : (g.name || `Grade ${g.level}`)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-stone-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick Actions (Collapse/Expand All & Refresh) */}
          <button
            onClick={() => handleToggleAll(!areAllExpanded)}
            title={areAllExpanded ? (lang === 'am' ? 'ሁሉንም ዝጋ' : 'Collapse All') : (lang === 'am' ? 'ሁሉንም ክፈት' : 'Expand All')}
            className="p-2.5 bg-stone-100 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-800 transition shrink-0"
            aria-label="Toggle expand all"
          >
            {areAllExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button
            onClick={loadCurriculum}
            title={lang === 'am' ? 'አድስ' : 'Refresh'}
            className="p-2.5 bg-stone-100 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-800 transition shrink-0"
            aria-label="Refresh curriculum"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Desktop/Tablet Horizontal Pills (hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex items-center gap-1.5 bg-stone-100 dark:bg-slate-900 p-1.5 rounded-xl border border-stone-200 dark:border-slate-800 text-xs font-semibold overflow-x-auto scrollbar-none py-1.5 max-w-full">
          <button
            onClick={() => setSelectedGrade('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition ${
              selectedGrade === 'all'
                ? 'bg-eotc-navy dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'am' ? 'ሁሉም' : 'All'}
          </button>
          {baseCurriculum.map((g) => (
            <button
              key={g.level}
              onClick={() => setSelectedGrade(g.level)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition ${
                selectedGrade === g.level
                  ? 'bg-eotc-navy dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow'
                  : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800'
              }`}
            >
              {lang === 'am' ? (g.amharicName || `ክፍል ${g.level}`) : (g.name || `Grade ${g.level}`)}
            </button>
          ))}
          {/* Toggle Expand/Collapse All */}
          <button
            onClick={() => handleToggleAll(!areAllExpanded)}
            title={areAllExpanded ? (lang === 'am' ? 'ሁሉንም ዝጋ' : 'Collapse All') : (lang === 'am' ? 'ሁሉንም ክፈት' : 'Expand All')}
            className="px-2.5 py-1.5 text-stone-600 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg shrink-0 transition flex items-center space-x-1"
          >
            {areAllExpanded ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400" />
                <span className="hidden md:inline">{lang === 'am' ? 'ዝጋ' : 'Collapse'}</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400" />
                <span className="hidden md:inline">{lang === 'am' ? 'ክፈት' : 'Expand'}</span>
              </>
            )}
          </button>

          <button
            onClick={loadCurriculum}
            title={lang === 'am' ? 'አድስ' : 'Refresh'}
            className="p-1.5 text-stone-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg shrink-0 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Curriculum by Grades */}
      <div className="space-y-8">
        {filteredCurriculum.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-stone-500 dark:text-slate-400 border border-stone-200 dark:border-slate-800 shadow-sm">
            {searchQuery ? (
              <p>{lang === 'am' ? `"${searchQuery}" የሚል የትምህርት ርዕስ አልተገኘም።` : `No matching topics found for "${searchQuery}".`}</p>
            ) : user && enrolledGradeIds.length === 0 ? (
              <div className="space-y-3 py-4 max-w-md mx-auto">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-stone-900 dark:text-white text-base">
                  {lang === 'am' ? 'እስካሁን የተመዘገቡበት ክፍል የለም' : 'You are not enrolled in any grades yet'}
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'am'
                    ? 'ትምህርቶችን ለመጀመር እባክዎ መማር የሚፈልጓቸውን ክፍሎች ይምረጡ።'
                    : 'To begin learning, please choose the grades you wish to attend.'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenEnrollModal}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{lang === 'am' ? 'ክፍል ይምረጡ' : 'Select Grades to Enroll'}</span>
                </button>
              </div>
            ) : (
              <p>{lang === 'am' ? 'ምንም የታተመ ትምህርት አልተገኘም።' : 'No published curriculum found for this filter.'}</p>
            )}
          </div>
        ) : (
          filteredCurriculum.map((grade) => {
            // Calculate Grade Level Completion
            const totalGradeSubjects = grade.subjects?.length || 0;
            const completedGradeSubjects = (grade.subjects || []).filter((s) => {
              const tCh = s.chapters?.length || 0;
              const cCh = (s.chapters || []).filter((c) => studentProgressMap[c.id]).length;
              return tCh > 0 && cCh === tCh;
            }).length;
            const isGradeCompleted = totalGradeSubjects > 0 && completedGradeSubjects === totalGradeSubjects;

            const isGradeExpanded = searchQuery ? true : (expandedGrades[grade.level] ?? true);

            return (
              <div key={grade.level} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 transition">
                {/* Grade Header (Collapsible) */}
                <div
                  onClick={() => toggleGrade(grade.level)}
                  className="pb-2 flex items-center justify-between gap-2 cursor-pointer select-none group"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleGrade(grade.level);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-black text-xs sm:text-base shadow-sm group-hover:bg-amber-200 dark:group-hover:bg-amber-900 transition shrink-0">
                      {grade.level}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                          {lang === 'am' ? `ክፍል ${grade.level}` : `Grade ${grade.level}`}
                        </span>
                        {isGradeEnrolled(grade) && (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-900 dark:text-amber-300 bg-amber-200/90 dark:bg-amber-950/80 px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                            <GraduationCap className="w-2.5 h-2.5 mr-0.5 text-amber-700 dark:text-amber-400" />
                            <span>{lang === 'am' ? 'የተመዘገቡበት' : 'Enrolled'}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-xl font-extrabold text-stone-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-amber-400 transition truncate">
                        {pick(grade.amharicName, grade.name)}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
                    {isGradeCompleted && (
                      <span className="hidden sm:inline-flex items-center text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-700">
                        <Award className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                        <span>100% {lang === 'am' ? 'ተጠናቋል' : 'Completed'}</span>
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium border border-stone-200/60 dark:border-slate-700">
                      {grade.subjects?.length || 0} {lang === 'am' ? 'ትምህርቶች' : 'Subjects'}
                    </span>
                    <div className="p-1 rounded-lg text-stone-400 dark:text-slate-500 group-hover:text-stone-700 dark:group-hover:text-slate-200 group-hover:bg-stone-100 dark:group-hover:bg-slate-800 transition">
                      {isGradeExpanded ? (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600 dark:text-slate-300" />
                      ) : (
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600 dark:text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Grade Content (Subjects & Chapters) */}
                {isGradeExpanded && (
                  <div className="space-y-5 pt-1 border-t border-stone-100 dark:border-slate-800">
                    {/* Grade Completed Golden Banner */}
                    {isGradeCompleted && (
                      <div className="p-3.5 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-emerald-500/20 border border-amber-400/60 rounded-xl flex items-center justify-between text-amber-950 font-bold text-xs sm:text-sm shadow-sm">
                        <div className="flex items-center space-x-2">
                          <Award className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>
                            {lang === 'am'
                              ? `🏆 እንኳን ደስ አለዎት! የክፍል ${grade.level} ትምህርቶችን በሙሉ አጠናቀዋል።`
                              : `🏆 Congratulations! Grade ${grade.level} fully completed.`}
                          </span>
                        </div>
                        <span className="text-xs bg-amber-500 text-slate-950 px-2.5 py-1 rounded-full font-extrabold">
                          100% {lang === 'am' ? 'ተጠናቋል' : 'Done'}
                        </span>
                      </div>
                    )}

                    {/* Subjects */}
                    <div className="space-y-4">
                      {grade.subjects?.map((subject) => {
                        const totalChapters = subject.chapters?.length || 0;
                        const completedChapters = (subject.chapters || []).filter(
                          (c) => studentProgressMap[c.id]
                        ).length;
                        const subjectProgressPercent =
                          totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
                        const isSubjectCompleted = totalChapters > 0 && completedChapters === totalChapters;
                        const isSubjectExpanded = searchQuery ? true : (expandedSubjects[subject.id] ?? true);

                        return (
                          <div key={subject.id} className="bg-stone-50/80 dark:bg-slate-950/70 rounded-xl p-4 sm:p-5 border border-stone-200 dark:border-slate-800 space-y-3.5 transition">
                            {/* Subject Header (Collapsible) */}
                            <div
                              onClick={() => toggleSubject(subject.id)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none group"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleSubject(subject.id);
                                }
                              }}
                            >
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-200 dark:bg-slate-800 text-stone-800 dark:text-slate-200 font-bold">
                                    {subject.code}
                                  </span>
                                  <h4 className="font-bold text-stone-900 dark:text-white text-base group-hover:text-amber-800 dark:group-hover:text-amber-400 transition">
                                    {pick(subject.amharicName, subject.name)}
                                  </h4>
                                  {isSubjectCompleted && (
                                    <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                      <span>{lang === 'am' ? 'ትምህርቱ ተጠናቋል' : 'Subject Completed'}</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-stone-500 dark:text-slate-400 font-mono mt-0.5 block">
                                  {totalChapters} {lang === 'am' ? 'ምዕራፎች' : 'Chapters'}
                                </span>
                              </div>

                              {/* Progress Text & Chevron */}
                              <div className="flex items-center space-x-2 sm:space-x-3 sm:justify-end">
                                <span className="text-xs font-semibold text-stone-600 dark:text-slate-400">
                                  {completedChapters} / {totalChapters} {lang === 'am' ? 'የተጠናቀቁ' : 'Completed'} ({subjectProgressPercent}%)
                                </span>
                                <div className="p-1 rounded-md text-stone-400 dark:text-slate-500 group-hover:text-stone-700 dark:group-hover:text-slate-200 group-hover:bg-stone-200/60 dark:group-hover:bg-slate-800 transition">
                                  {isSubjectExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-stone-600 dark:text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-stone-600 dark:text-slate-400" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Subject Collapsible Content: Progress Bar & Chapters Grid */}
                            {isSubjectExpanded && (
                              <div className="space-y-4 pt-1">
                                {/* Subject Progress Bar */}
                                <div className="w-full bg-stone-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                                  <div
                                    className={`h-full transition-all duration-500 rounded-full ${
                                      isSubjectCompleted ? 'bg-emerald-600' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${subjectProgressPercent}%` }}
                                  />
                                </div>

                                {/* Chapters Grid */}
                                {subject.chapters && subject.chapters.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                    {subject.chapters.map((chapter) => {
                                      const status = downloadStatuses[chapter.id] || 'NOT_DOWNLOADED';
                                      const isDownloading = downloadingId === chapter.id;
                                      const isChapterDone = studentProgressMap[chapter.id] ?? false;

                                      return (
                                        <div
                                          key={chapter.id}
                                          className={`p-3.5 sm:p-5 rounded-xl border transition flex flex-col justify-between ${
                                            isChapterDone
                                              ? 'border-emerald-300/80 dark:border-emerald-800 shadow-sm bg-gradient-to-b from-emerald-50/20 to-white dark:from-emerald-950/20 dark:to-slate-900'
                                              : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md'
                                          }`}
                                        >
                                          <div>
                                            <div className="flex items-center justify-between mb-2.5">
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                                  {lang === 'am' ? `ምዕራፍ ${chapter.chapterNumber}` : `Chapter ${chapter.chapterNumber}`}
                                                </span>
                                                {isChapterDone && (
                                                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                                    <span>{lang === 'am' ? 'ተጠናቋል' : 'Completed'}</span>
                                                  </span>
                                                )}
                                              </div>
                                              <OfflineBadge status={status} />
                                            </div>
                                            <h5
                                              onClick={(e) => handleStudyClick(chapter, e)}
                                              className="font-bold text-stone-900 dark:text-slate-100 text-sm sm:text-base mb-1 hover:text-amber-800 dark:hover:text-amber-400 transition cursor-pointer"
                                            >
                                              {pick(chapter.amharicTitle, chapter.title)}
                                            </h5>
                                          </div>

                                          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-slate-800 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2.5">
                                            <div className="flex items-center space-x-2 w-full min-[380px]:w-auto">
                                              <button
                                                type="button"
                                                onClick={(e) => handleStudyClick(chapter, e)}
                                                className="flex-1 min-[380px]:flex-none justify-center inline-flex items-center text-xs font-bold text-white dark:text-slate-950 bg-eotc-navy dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                                              >
                                                <span>{lang === 'am' ? 'ተማር' : 'Study'}</span>
                                                <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={(e) => handleQuizClick(chapter, e)}
                                                className="flex-1 min-[380px]:flex-none justify-center inline-flex items-center text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900/80 px-2.5 py-1.5 rounded-lg transition cursor-pointer border border-transparent dark:border-amber-800/60"
                                              >
                                                <HelpCircle className="w-3.5 h-3.5 mr-1 text-amber-700 dark:text-amber-400" />
                                                <span>{lang === 'am' ? 'ፈተና' : 'Quiz'}</span>
                                              </button>
                                            </div>

                                            {user && (
                                              <div className="w-full min-[380px]:w-auto flex justify-end">
                                                {status !== 'AVAILABLE_OFFLINE' ? (
                                                  <button
                                                    onClick={(e) => handleDownload(chapter.id, e)}
                                                    disabled={isDownloading}
                                                    className="w-full min-[380px]:w-auto justify-center inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-600/30 disabled:opacity-50 transition shadow-sm"
                                                  >
                                                    {isDownloading ? (
                                                      <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        <span>{lang === 'am' ? 'በማውረድ ላይ...' : 'Downloading...'}</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Download className="w-3.5 h-3.5" />
                                                        <span>{lang === 'am' ? 'አውርድ' : 'Download'}</span>
                                                      </>
                                                    )}
                                                  </button>
                                                ) : (
                                                  <span className="inline-flex items-center text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                    <span>{lang === 'am' ? 'ዝግጁ' : 'Ready Offline'}</span>
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-stone-400 italic">
                                    {lang === 'am' ? 'ምንም የታተሙ ምዕራፎች የሉም' : 'No published chapters yet'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {/* Skippable Download Prompt Modal */}
      {studyPromptChapter && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-400 font-bold">
                <Download className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{lang === 'am' ? 'መጀመሪያ ማውረድ ይፈልጋሉ?' : 'Download for Offline Study First?'}</span>
              </div>
              <button
                onClick={() => setStudyPromptChapter(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200">
                <strong>{studyPromptChapter.title}</strong>
              </div>
              <p className="text-sm text-stone-600 dark:text-slate-400 leading-relaxed">
                {lang === 'am'
                  ? 'ይህንን ምዕራፍ ከመስመር ውጭ ለማጥናት መጀመሪያ ማውረድ ይመከራል። አንዴ ካወረዱት ያለ ኢንተርኔት በከፍተኛ ፍጥነት ማንበብ እና ፈተናዎችን መውሰድ ይችላሉ።'
                  : 'We recommend downloading this chapter first for an uninterrupted offline experience with instant page turns and offline quizzes.'}
              </p>

              {studyPromptDownloading && (
                <div className="p-3 bg-stone-100 dark:bg-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-stone-800 dark:text-slate-200">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                    <span>{studyPromptProgress}</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-600 dark:bg-amber-500 h-full animate-pulse rounded-full w-2/3" />
                  </div>
                </div>
              )}

              <label className="flex items-center space-x-2 text-xs text-stone-600 dark:text-slate-400 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontAskDownloadAgain}
                  onChange={(e) => setDontAskDownloadAgain(e.target.checked)}
                  className="rounded border-stone-300 dark:border-slate-700 dark:bg-slate-800 text-amber-600 focus:ring-amber-500"
                />
                <span>{lang === 'am' ? 'ዳግመኛ በዚህ መሣሪያ ላይ አትጠይቀኝ' : "Don't ask again on this device"}</span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100 dark:border-slate-800">
              <button
                onClick={handlePromptSkipAndStudy}
                disabled={studyPromptDownloading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                {lang === 'am' ? 'በመስመር ላይ ቀጥል (ዝለል)' : 'Continue Online (Skip)'}
              </button>
              <button
                onClick={handlePromptDownloadAndStudy}
                disabled={studyPromptDownloading}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow transition flex items-center space-x-1.5"
              >
                {studyPromptDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'am' ? 'በማውረድ ላይ...' : 'Downloading...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'am' ? 'አውርድና ተማር' : 'Download & Study'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Multi-Grade Enrollment Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-stone-900 dark:text-white font-bold">
                <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{lang === 'am' ? 'አዲስ ክፍል ይመዝገቡ' : 'Enroll in New Grades'}</span>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-4">
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                {lang === 'am'
                  ? 'እስካሁን ያልተመዘገቡባቸው ክፍሎች ከዚህ በታች ቀርበዋል። መማር የሚፈልጉትን ተጨማሪ ክፍል ይምረጡ።'
                  : 'Below are available grades you have not enrolled in yet. Select any you wish to add.'}
              </p>

              {unenrolledGrades.length === 0 ? (
                <div className="py-8 text-center space-y-3 bg-stone-50 dark:bg-slate-950/80 rounded-2xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-stone-900 dark:text-white text-sm">
                    {lang === 'am' ? 'ሁሉንም የሚገኙ ክፍሎችን ተመዝግበዋል!' : 'You are enrolled in all available grades!'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    {lang === 'am'
                      ? 'የተመዘገቡባቸው ክፍሎች በሙሉ በትምህርት ገበታዎ ላይ ቀርበዋል።'
                      : 'All available grade levels have already been added to your study dashboard.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
                  {unenrolledGrades.map((g) => {
                    const gradeId = g.id || `grade-level-${g.level}`;
                    const isChecked = tempEnrollmentIds.includes(gradeId);
                    return (
                      <button
                        key={gradeId}
                        type="button"
                        onClick={() => handleToggleTempEnroll(gradeId)}
                        className={`w-full text-left select-none p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2.5 transition ${
                          isChecked
                            ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm'
                            : 'bg-stone-50 dark:bg-slate-950 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition ${
                            isChecked
                              ? 'bg-slate-900 border-slate-900 text-amber-400'
                              : 'border-stone-400 dark:border-slate-600 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isChecked && (
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                            </svg>
                          )}
                        </div>
                        <span className="truncate">
                          {pick(g.name, g.amharicName)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {unenrolledGrades.length > 0 && (
                <div className="text-[11px] text-stone-500 dark:text-slate-400">
                  {lang === 'am'
                    ? `${tempEnrollmentIds.length} አዲስ ክፍሎች ተመርጠዋል`
                    : `${tempEnrollmentIds.length} new grade(s) selected`}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                disabled={enrollSaving}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                {lang === 'am' ? 'ዝጋ' : 'Close'}
              </button>
              {unenrolledGrades.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveEnrollments}
                  disabled={enrollSaving || tempEnrollmentIds.length === 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {enrollSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{lang === 'am' ? 'በማስቀመጥ ላይ...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'am' ? 'መዝግብ' : 'Add to My Grades'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Required Barrier Modal for Public / Guest Users */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Top Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0 shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block mb-0.5">
                    {lang === 'am' ? 'የተማሪ ምዝገባ' : 'Student Enrollment'}
                  </span>
                  <h3 className="font-extrabold text-lg text-stone-900 dark:text-white leading-tight">
                    {lang === 'am' ? 'እባክዎ መጀመሪያ ይመዝገቡ' : 'Please Register First'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Notice */}
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
              <p className="font-bold">
                {selectedChapterForGate
                  ? (lang === 'am'
                      ? `«${selectedChapterForGate.title}» የተሰኘውን ምዕራፍ ለማጥናት፣ ፈተናዎችን ለመውሰድ እና መጻሕፍትን ለማንበብ የተማሪ መለያ ያስፈልግዎታል።`
                      : `To study «${selectedChapterForGate.title}», read textbooks, and take quizzes, you must have an active student account.`)
                  : (lang === 'am'
                      ? 'የትምህርት ክፍሎችን ለማጥናት፣ መጻሕፍትን ለማውረድ እና ፈተናዎችን ለመውሰድ እባክዎ እንደ ተማሪ ይመዝገቡ።'
                      : 'To access Sunday school textbooks, practice quizzes, and offline downloads, please register as a student.')}
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                {lang === 'am'
                  ? 'ምዝገባው ሙሉ በሙሉ በነጻ የሚቀርብ ሲሆን ከ1 ደቂቃ በታች ይወስዳል።'
                  : 'Enrollment is 100% free for all students and takes under 1 minute.'}
              </p>
            </div>

            {/* Platform Features */}
            <div className="space-y-2 text-xs text-stone-600 dark:text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{lang === 'am' ? 'ሙሉ በሙሉ በነጻ የሚቀርብ ኦርቶዶክሳዊ ትምህርት' : '100% Free Orthodox Christian curriculum'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{lang === 'am' ? 'ያለ ኢንተርኔት (Offline) መጻሕፍትን ማንበብና መፈተን' : 'Study clamped textbooks & quizzes completely offline'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{lang === 'am' ? 'የውጤት ክትትልና በበርካታ ክፍሎች መመዝገብ' : 'Track your progress & enroll in multiple grades'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const target = selectedChapterForGate
                    ? `/login?mode=register&redirect=/chapters/${selectedChapterForGate.id}`
                    : '/login?mode=register';
                  setIsRegisterModalOpen(false);
                  router.push(target);
                }}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>{lang === 'am' ? 'አሁን በነጻ ይመዝገቡ' : 'Register as Student Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = selectedChapterForGate
                    ? `/login?redirect=/chapters/${selectedChapterForGate.id}`
                    : '/login';
                  setIsRegisterModalOpen(false);
                  router.push(target);
                }}
                className="w-full py-2.5 px-4 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                {lang === 'am' ? 'መለያ አለዎት? ይግቡ' : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
