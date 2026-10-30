'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  BookOpen,
  HelpCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  PlusCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Loader2,
  X,
  Church,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import Pagination from '@/components/Pagination';
import type {
  QuestionType,
  ModeratedReferenceDto,
  PracticeQuestionDto,
  TeacherParishOverviewDto,
} from '@eotc/shared';
import { Select } from '@/components/Select';

type TeacherTab = 'overview' | 'students' | 'contribute' | 'submissions';

export default function TeacherPortalPage() {
  const router = useRouter();
  const { lang, pick } = useLanguage();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TeacherTab>('overview');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Parish Overview Data
  const [overview, setOverview] = useState<TeacherParishOverviewDto | null>(null);

  // Students & Progress Data
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPageSize, setStudentsPageSize] = useState(10);
  const [selectedStudentProgress, setSelectedStudentProgress] = useState<any | null>(null);
  const [loadingStudentProgress, setLoadingStudentProgress] = useState(false);

  // Submissions Data
  const [submissions, setSubmissions] = useState<{
    references: ModeratedReferenceDto[];
    practiceQuestions: PracticeQuestionDto[];
  }>({ references: [], practiceQuestions: [] });

  // Curriculum Data for Content Contribution
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // Contribution Form State
  const [contributionType, setContributionType] = useState<'REFERENCE' | 'PRACTICE_QUESTION'>('REFERENCE');

  // Reference Form
  const [refTitle, setRefTitle] = useState('');
  const [refSource, setRefSource] = useState<'UPLOAD' | 'LINK'>('UPLOAD');
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refUrl, setRefUrl] = useState('');
  const [refIsDownloadable, setRefIsDownloadable] = useState(false);
  const [refDownloadUrl, setRefDownloadUrl] = useState('');
  const [refDocSize, setRefDocSize] = useState<number | undefined>(undefined);

  // Practice Question Form
  const [qType, setQType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [qText, setQText] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  // Multiple Choice choices
  const [mcChoices, setMcChoices] = useState<
    Array<{ text: string; isCorrect: boolean }>
  >([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ]);
  // True / False correct answer
  const [tfCorrect, setTfCorrect] = useState<'TRUE' | 'FALSE'>('TRUE');
  // Short Answer expected text
  const [saAnswer, setSaAnswer] = useState('');
  // Prepared questions waiting to be sent for review in one go
  const [draftQuestions, setDraftQuestions] = useState<any[]>([]);
  const [draftChapterId, setDraftChapterId] = useState('');
  const [draftChapterLabel, setDraftChapterLabel] = useState('');

  useEffect(() => {
    initPortal();
  }, []);

  const initPortal = async () => {
    setLoading(true);
    try {
      await api.init();
      const user = api.getUser();
      if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
        router.push('/login?redirect=/teacher');
        return;
      }
      setCurrentUser(user);
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'overview' || tabParam === 'students' || tabParam === 'contribute' || tabParam === 'submissions') {
        setActiveTab(tabParam);
      }

      if (user.churchParish) {
        // Load parish overview
        const ov = await api.getTeacherParishOverview().catch(() => null);
        setOverview(ov);

        // Load parish students
        const stData = await api.getTeacherParishStudents().catch(() => ({ students: [] }));
        setStudents(stData.students || []);

        // Load teacher submissions
        const subs = await api.getTeacherSubmissions().catch(() => ({ references: [], practiceQuestions: [] }));
        setSubmissions(subs);
      }

      // Load curriculum for contribution selectors
      const curr = await api.getCurriculum().catch(() => []);
      setCurriculum(curr || []);
    } catch (err: any) {
      console.error('Failed to initialize teacher portal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await initPortal();
    setLoading(false);
  };

  const handleOpenStudentProgress = async (student: any) => {
    setLoadingStudentProgress(true);
    setSelectedStudentProgress({ student, progress: [] });
    try {
      const data = await api.getTeacherStudentProgress(student.id);
      setSelectedStudentProgress(data);
    } catch (err) {
      console.error('Failed to load student progress:', err);
    } finally {
      setLoadingStudentProgress(false);
    }
  };

  const handleAddChoice = () => {
    setMcChoices((prev) => [...prev, { text: '', isCorrect: false }]);
  };

  const handleRemoveChoice = (idx: number) => {
    if (mcChoices.length <= 2) return;
    setMcChoices((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSetChoiceCorrect = (idx: number) => {
    setMcChoices((prev) =>
      prev.map((c, i) => ({
        ...c,
        isCorrect: i === idx,
      }))
    );
  };

  const handleUpdateChoiceText = (idx: number, field: 'text', val: string) => {
    setMcChoices((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c))
    );
  };

  const handleSubmitReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) {
      setFeedbackMsg({
        type: 'error',
        text: lang === 'am' ? 'እባክዎ መጀመሪያ ምዕራፍ ይምረጡ' : 'Please select a chapter first',
      });
      return;
    }
    if (!refTitle.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: lang === 'am' ? 'እባክዎ የሰነዱን ርዕስ ያስገቡ' : 'Please provide a document title',
      });
      return;
    }
    if (refSource === 'UPLOAD' ? !refFile : !refUrl.trim()) {
      setFeedbackMsg({
        type: 'error',
        text:
          refSource === 'UPLOAD'
            ? (lang === 'am' ? 'እባክዎ ሰነድ ይምረጡ' : 'Please choose a document to upload')
            : (lang === 'am' ? 'እባክዎ አድራሻ (URL) ያስገቡ' : 'Please provide a link'),
      });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      if (refSource === 'UPLOAD' && refFile) {
        const uploaded = await api.uploadTeacherReference(refFile);
        await api.submitTeacherReference(selectedChapterId, {
          title: refTitle.trim(),
          isDownloadable: true,
          downloadableDocUrl: uploaded.fileUrl,
          downloadableDocSize: uploaded.fileSize,
          downloadableDocChecksum: uploaded.checksumSha256,
        });
      } else {
        await api.submitTeacherReference(selectedChapterId, {
          title: refTitle.trim(),
          url: refUrl.trim(),
          isDownloadable: refIsDownloadable,
          downloadableDocUrl: refIsDownloadable ? (refDownloadUrl.trim() || refUrl.trim()) : undefined,
          downloadableDocSize: refDocSize || undefined,
        });
      }

      setFeedbackMsg({
        type: 'success',
        text:
          lang === 'am'
            ? 'ማጣቀሻው በተሳካ ሁኔታ ቀርቧል! በአስተዳዳሪ (Admin) ከተገመገመና ከጸደቀ በኋላ ለተማሪዎች ይታያል።'
            : 'Reference submitted successfully! It will appear after Admin review and approval.',
      });

      // Clear fields
      setRefTitle('');
      setRefUrl('');
      setRefFile(null);
      setRefDownloadUrl('');
      setRefIsDownloadable(false);
      setRefDocSize(undefined);

      // Refresh submissions
      const subs = await api.getTeacherSubmissions().catch(() => ({ references: [], practiceQuestions: [] }));
      setSubmissions(subs);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDraftQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) {
      setFeedbackMsg({
        type: 'error',
        text: lang === 'am' ? 'እባክዎ መጀመሪያ ምዕራፍ ይምረጡ' : 'Please select a chapter first',
      });
      return;
    }
    if (!qText.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: lang === 'am' ? 'እባክዎ የጥያቄውን ይዘት ያስገቡ' : 'Please enter question text',
      });
      return;
    }

    if (draftQuestions.length > 0 && draftChapterId !== selectedChapterId) {
      setFeedbackMsg({
        type: 'error',
        text:
          lang === 'am'
            ? 'መጀመሪያ ያዘጋጇቸውን ጥያቄዎች ይላኩ ወይም ያስወግዱ፤ ከዚያ ሌላ ምዕራፍ ይምረጡ።'
            : 'Send or discard the questions you drafted for the other chapter before switching chapters.',
      });
      return;
    }

    setFeedbackMsg(null);
    try {
      const payload: any = {
        chapterId: selectedChapterId,
        questionType: qType,
        prompt: qText.trim(),
        explanation: qExplanation.trim() || undefined,
      };

      if (qType === 'MULTIPLE_CHOICE') {
        const validChoices = mcChoices.filter((c) => c.text.trim());
        if (validChoices.length < 2) {
          throw new Error(
            lang === 'am'
              ? 'ለባለብዙ ምርጫ ቢያንስ 2 አማራጮች ያስፈልጋሉ'
              : 'Multiple choice questions require at least 2 complete choices'
          );
        }
        if (!validChoices.some((c) => c.isCorrect)) {
          validChoices[0]!.isCorrect = true;
        }
        payload.choices = validChoices.map((c, idx) => ({
          text: c.text.trim(),
          isCorrect: c.isCorrect,
          orderIndex: idx + 1,
        }));
      } else if (qType === 'TRUE_FALSE') {
        payload.choices = [
          {
            text: 'True',
            isCorrect: tfCorrect === 'TRUE',
            orderIndex: 1,
          },
          {
            text: 'False',
            isCorrect: tfCorrect === 'FALSE',
            orderIndex: 2,
          },
        ];
      } else if (qType === 'SHORT_ANSWER') {
        payload.hasAnswer = !!saAnswer.trim();
        payload.answerText = saAnswer.trim() || undefined;
      }

      if (draftQuestions.length === 0) {
        const chapter = activeChapters.find((c: any) => c.id === selectedChapterId);
        setDraftChapterId(selectedChapterId);
        setDraftChapterLabel(chapter ? pick(chapter.amharicTitle, chapter.title) : '');
      }
      setDraftQuestions((prev) => [...prev, payload]);

      // Clear fields so the next question can be prepared right away
      setQText('');
      setQExplanation('');
      setSaAnswer('');
      setMcChoices([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ]);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Could not add question' });
    }
  };

  const handleRemoveDraft = (idx: number) => {
    setDraftQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDiscardDrafts = () => {
    setDraftQuestions([]);
    setDraftChapterId('');
    setDraftChapterLabel('');
  };

  const handleSendDraftsForReview = async () => {
    if (draftQuestions.length === 0 || !draftChapterId) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const result = await api.submitTeacherPracticeQuestionBatch(
        draftChapterId,
        draftQuestions.map(({ chapterId: _c, ...q }) => q)
      );
      setFeedbackMsg({
        type: 'success',
        text:
          lang === 'am'
            ? `${result.count} የልምምድ ጥያቄዎች ለግምገማ ተልከዋል! አስተዳዳሪው ከገመገመ በኋላ ለተማሪዎች ይታያሉ።`
            : `${result.count} practice question${result.count === 1 ? '' : 's'} sent for review. Students will see them once an admin approves.`,
      });
      handleDiscardDrafts();
      const subs = await api.getTeacherSubmissions().catch(() => ({ references: [], practiceQuestions: [] }));
      setSubmissions(subs);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      (s.fullName && s.fullName.toLowerCase().includes(q)) ||
      (s.christianName && s.christianName.toLowerCase().includes(q)) ||
      (s.phoneNumber && s.phoneNumber.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const paginatedStudents = React.useMemo(() => {
    const start = (studentsPage - 1) * studentsPageSize;
    return filteredStudents.slice(start, start + studentsPageSize);
  }, [filteredStudents, studentsPage, studentsPageSize]);

  // Selected Grade / Subject / Chapter cascading objects
  const activeGrade = curriculum.find((g) => g.id === selectedGradeId);
  const activeSubject = activeGrade?.subjects?.find((s: any) => s.id === selectedSubjectId);
  const activeChapters = activeSubject?.chapters || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-500 dark:text-slate-400">
        <Loader2 className="w-9 h-9 animate-spin text-amber-600 dark:text-amber-400 mb-3" />
        <p className="font-semibold text-sm">
          {lang === 'am' ? 'የአስተማሪ መድረክን በማዘጋጀት ላይ...' : 'Loading teacher portal...'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-0 sm:px-6 py-4 sm:py-8 space-y-6 overflow-x-clip">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-800/40 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/30">
                ✟ {lang === 'am' ? 'የኦርቶዶክስ ተዋሕዶ ሰንበት ትምህርት ቤት' : 'EOTC Sunday School Platform'}
              </span>
              <span className="text-xs font-bold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/50">
                {currentUser?.role}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {lang === 'am' ? 'የመምህራን መድረክ' : 'Teacher Scoped Portal'}
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {lang === 'am'
                ? 'በተመደቡበት ሰንበት ትምህርት ቤት ያሉ ተማሪዎችን ይከታተሉ፣ የትምህርት ሂደታቸውን ይመልከቱ፣ እንዲሁም በአስተዳዳሪ የሚጸድቁ ማጣቀሻዎችንና የልምምድ ጥያቄዎችን ያበርክቱ።'
                : "Manage students in your assigned Sunday School, inspect their study progress, and contribute approved reference documents and self-study practice drills."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 md:shrink-0">
            {currentUser?.churchParish ? (
              <div className="bg-stone-900/90 border border-amber-500/40 rounded-2xl p-3.5 px-4 shadow-inner flex items-center space-x-3 min-w-0">
                <Church className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-amber-300 uppercase tracking-wider block font-bold">
                    {lang === 'am' ? 'የተመደቡበት ደብር / ሰንበት ት/ቤት' : 'Assigned Sunday School'}
                  </span>
                  <span className="font-extrabold text-sm text-white break-words block">
                    {currentUser.churchParish}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-3 px-4 flex items-center space-x-2 text-rose-200">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="text-xs font-bold">
                  {lang === 'am' ? 'ደብር አልተመደበም (ያልተመደበ)' : 'No Sunday School Assigned'}
                </span>
              </div>
            )}

            <button
              onClick={handleRefresh}
              className="p-2.5 rounded-xl bg-amber-800/40 hover:bg-amber-800/70 border border-amber-700/50 text-amber-200 transition flex items-center justify-center cursor-pointer"
              title={lang === 'am' ? 'ዳግም ጫን' : 'Refresh'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Unassigned Warning Banner */}
      {!currentUser?.churchParish && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 sm:p-5 flex items-start space-x-3 text-amber-900 dark:text-amber-200 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
              {lang === 'am' ? 'ትኩረት፡ ሰንበት ትምህርት ቤት አልተመደበልዎትም' : 'Notice: Unassigned Sunday School'}
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {lang === 'am'
                ? 'የተማሪዎችን ዝርዝርና የትምህርት ሂደት ለመመልከት ዋናው አስተዳዳሪ (Admin) ወደ ደብርዎ መመደብ አለበት። እባክዎ የአስተዳዳሪውን ድጋፍ ይጠይቁ።'
                : 'To view students and access your Sunday School cohort, an Admin must assign your Sunday School. Please reach out to your system administrator.'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 dark:border-slate-800 bg-stone-100/80 dark:bg-slate-900/80 p-1.5 rounded-2xl gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-400 shadow-sm border border-amber-200/80 dark:border-amber-500/30'
              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Church className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>{lang === 'am' ? 'አጠቃላይ እይታ' : 'Sunday School Overview'}</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'students'
              ? 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-400 shadow-sm border border-amber-200/80 dark:border-amber-500/30'
              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>{lang === 'am' ? 'የሰንበት ት/ቤት ተማሪዎች' : 'Sunday School Students'}</span>
          {students.length > 0 && (
            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800/50">
              {students.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('contribute')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'contribute'
              ? 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-400 shadow-sm border border-amber-200/80 dark:border-amber-500/30'
              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>{lang === 'am' ? 'ይዘት ያበርክቱ' : 'Contribute Content'}</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'submissions'
              ? 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-400 shadow-sm border border-amber-200/80 dark:border-amber-500/30'
              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>{lang === 'am' ? 'የእኔ አስተዋጽኦዎች' : 'My Submissions'}</span>
          {(submissions.references.length + submissions.practiceQuestions.length) > 0 && (
            <span className="text-[10px] bg-stone-200 dark:bg-slate-800 text-stone-800 dark:text-slate-200 px-2 py-0.5 rounded-full font-bold border border-stone-300 dark:border-slate-700">
              {submissions.references.length + submissions.practiceQuestions.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold border border-amber-200 dark:border-amber-800/50">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block">
                  {lang === 'am' ? 'የደብሩ ተማሪዎች' : 'Sunday School Students'}
                </span>
                <span className="text-2xl font-black text-stone-900 dark:text-white">
                  {overview?.totalStudents ?? students.length}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold border border-emerald-200 dark:border-emerald-800/50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block">
                  {lang === 'am' ? 'ንቁ ተማሪዎች' : 'Active Learners'}
                </span>
                <span className="text-2xl font-black text-stone-900 dark:text-white">
                  {overview?.activeStudents ?? 0}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold border border-blue-200 dark:border-blue-800/50">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block">
                  {lang === 'am' ? 'የተጠናቀቁ ምዕራፎች' : 'Completed Chapters'}
                </span>
                <span className="text-2xl font-black text-stone-900 dark:text-white">
                  {overview?.completedChaptersCount ?? 0}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold border border-purple-200 dark:border-purple-800/50">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block">
                  {lang === 'am' ? 'በግምገማ ላይ ያሉ' : 'Pending Review'}
                </span>
                <span className="text-2xl font-black text-stone-900 dark:text-white">
                  {overview?.pendingSubmissionsCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Teacher Guidance / Orthodox Integrity Card */}
          <div className="bg-stone-50 dark:bg-slate-900/60 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
                {lang === 'am' ? 'የመምህራን መመሪያና የመጽሐፍ ቅዱስ አስተምህሮ ጥበቃ' : 'EOTC Doctrine & Content Guidelines'}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
              {lang === 'am'
                ? 'በኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን ቀኖና መሠረት ዋና ዋና የትምህርት መጻሕፍት (Core Syllabus) በቅዱስ ሲኖዶስ የተዘጋጁ ናቸው። መምህራን ተጨማሪ ማጣቀሻዎችንና ራስን መፈተሻ የልምምድ ጥያቄዎችን ብቻ ማበርከት የሚችሉ ሲሆን ሁሉም ይዘት በአስተዳዳሪ ተገምግሞ ከጸደቀ በኋላ ብቻ ለተማሪዎች ይታያል።'
                : 'Per EOTC Synod guidelines, core textbooks remain immutable. Teachers are empowered to contribute supplementary reading references and formative practice questions. All submissions pass through the Admin Moderation Desk to maintain doctrinal integrity.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-stone-200 dark:border-slate-800">
                <span className="font-bold text-xs text-stone-900 dark:text-white block mb-1">
                  {lang === 'am' ? '፩. የደብር ተማሪዎችን መከታተል' : '1. Monitor Sunday School Learners'}
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  {lang === 'am' ? 'የተማሪዎችን የፈተና ውጤትና ያነበቧቸውን ምዕራፎች በቀላሉ ይከታተሉ።' : 'Inspect chapter completion and quiz scores in your Sunday School.'}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-stone-200 dark:border-slate-800">
                <span className="font-bold text-xs text-stone-900 dark:text-white block mb-1">
                  {lang === 'am' ? '፪. ጥራት ያለው ማጣቀሻ ማቅረብ' : '2. Quality References'}
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  {lang === 'am' ? 'ለተማሪዎች ጠቃሚ የሆኑ የቤተክርስቲያን ጽሑፎችንና ፒዲኤፍ ሰነዶችን ያጋሩ።' : 'Share relevant Patristic and Synod-aligned documents.'}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-stone-200 dark:border-slate-800">
                <span className="font-bold text-xs text-stone-900 dark:text-white block mb-1">
                  {lang === 'am' ? '፫. የልምምድ ጥያቄዎችን ማዘጋጀት' : '3. Practice Questions'}
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  {lang === 'am' ? 'ተማሪዎች እውቀታቸውን እንዲፈትሹ ማብራሪያ ያላቸው ጥያቄዎችን ያበርክቱ።' : 'Draft self-study questions with spiritual explanations.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS & PROGRESS */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 dark:text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={lang === 'am' ? 'ተማሪ በስም ወይም በስልክ ይፈልጉ...' : 'Search student by name or phone...'}
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentsPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <span className="text-xs text-stone-500 dark:text-slate-400 font-medium">
              {lang === 'am'
                ? `በደብሩ ውስጥ የተመዘገቡ ${filteredStudents.length} ተማሪዎች`
                : `${filteredStudents.length} students enrolled in Sunday School`}
            </span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-stone-200 dark:border-slate-800 text-center text-stone-500 dark:text-slate-400 space-y-2">
              <Users className="w-10 h-10 text-stone-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-stone-700 dark:text-slate-300">
                {lang === 'am' ? 'ምንም ተማሪ አልተገኘም' : 'No students found in your Sunday School'}
              </p>
              <p className="text-xs text-stone-400 dark:text-slate-500">
                {lang === 'am'
                  ? 'ተማሪዎች ሲመዘገቡ ይህን ደብር ከመረጡ እዚህ ዝርዝራቸው ይታያል።'
                  : 'Students registered with your Sunday School will automatically appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {paginatedStudents.map((st) => (
                  <div
                    key={st.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-4 shadow-xs hover:border-amber-300 dark:hover:border-amber-500/50 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm text-stone-900 dark:text-white">
                          {st.fullName}
                        </h4>
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                          {st.churchParish || 'Sunday School'}
                        </span>
                      </div>
                      {st.christianName && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          {lang === 'am' ? 'የክርስትና ስም: ' : 'Christian Name: '}
                          <span className="font-semibold">{st.christianName}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-stone-500 dark:text-slate-400">
                        {st.phoneNumber || st.email || (lang === 'am' ? 'ስልክ አልተመዘገበም' : 'No phone recorded')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-600 dark:text-slate-400">
                        {lang === 'am' ? 'የትምህርት ሂደት' : 'Study Progress'}
                      </span>
                      <button
                        onClick={() => handleOpenStudentProgress(st)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{lang === 'am' ? 'ዝርዝር እይ' : 'View Details'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {filteredStudents.length > 0 && (
                <Pagination
                  currentPage={studentsPage}
                  totalPages={Math.ceil(filteredStudents.length / studentsPageSize) || 1}
                  totalItems={filteredStudents.length}
                  pageSize={studentsPageSize}
                  pageSizeOptions={[10, 25, 50]}
                  onPageChange={(p) => setStudentsPage(p)}
                  onPageSizeChange={(s) => {
                    setStudentsPageSize(s);
                    setStudentsPage(1);
                  }}
                  itemName={lang === 'am' ? 'ተማሪዎች' : 'Students'}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* STUDENT PROGRESS MODAL */}
      {selectedStudentProgress && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-xl w-full rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                  {lang === 'am' ? 'የተማሪ ውጤትና ሂደት' : 'Student Progress Dossier'}
                </span>
                <h3 className="text-lg font-black text-stone-900 dark:text-white mt-1">
                  {selectedStudentProgress.student?.fullName}
                </h3>
                {selectedStudentProgress.student?.christianName && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {lang === 'am' ? 'የክርስትና ስም: ' : 'Christian Name: '}
                    {selectedStudentProgress.student?.christianName}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedStudentProgress(null)}
                className="p-1 rounded-lg text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingStudentProgress ? (
              <div className="py-10 text-center text-stone-500 dark:text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400 mx-auto" />
                <p className="text-xs">{lang === 'am' ? 'ሂደቱን በማምጣት ላይ...' : 'Fetching progress...'}</p>
              </div>
            ) : selectedStudentProgress.progress?.length === 0 ? (
              <div className="py-8 text-center text-stone-500 dark:text-slate-400">
                <p className="text-xs font-semibold">
                  {lang === 'am' ? 'ተማሪው እስካሁን ምንም ያጠናቀቀው ምዕራፍ የለም።' : 'No chapter progress recorded yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                  {lang === 'am' ? 'የተጠናቀቁ ምዕራፎችና የፈተና ውጤቶች' : 'Completed Chapters & Quiz Scores'}
                </h4>
                <div className="space-y-2">
                  {selectedStudentProgress.progress.map((p: any) => (
                    <div
                      key={p.chapterId}
                      className="p-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 flex items-center justify-between gap-3"
                    >
                      <div>
                        <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                          {p.chapter?.amharicTitle || p.chapter?.title || p.chapterId}
                        </h5>
                        <span className="text-[10px] text-stone-500 dark:text-slate-400">
                          {lang === 'am' ? 'መጨረሻ የተነበበው: ' : 'Last studied: '}
                          {p.lastStudiedAt ? new Date(p.lastStudiedAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="text-right">
                        {p.isCompleted ? (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{lang === 'am' ? 'ተጠናቋል' : 'Completed'}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
                            {lang === 'am' ? 'በንባብ ላይ' : 'In Progress'}
                          </span>
                        )}
                        {p.quizScore !== null && p.quizScore !== undefined && (
                          <p className="text-xs font-mono font-bold text-stone-700 dark:text-slate-300 mt-1">
                            {lang === 'am' ? 'ውጤት: ' : 'Score: '}
                            {p.quizScore}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONTRIBUTE CONTENT */}
      {activeTab === 'contribute' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
              {lang === 'am' ? 'የትምህርት ይዘት ማበርከቻ ቅጽ' : 'Contribute Educational Materials'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              {lang === 'am'
                ? 'የሚያበረክቷቸው ማጣቀሻዎች እና የልምምድ ጥያቄዎች ለተማሪዎች ከመታየታቸው በፊት በአስተዳዳሪ (Admin) ይገመገማሉ።'
                : 'All supplementary references and self-study practice questions require Admin moderation.'}
            </p>
          </div>

          {feedbackMsg && (
            <div
              className={`p-4 rounded-2xl flex items-start space-x-2.5 text-xs font-bold ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Cascading Selectors: Grade -> Subject -> Chapter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-stone-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-stone-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? '፩. ክፍል ምረጥ' : '1. Select Grade'}
              </label>
              <Select
                value={selectedGradeId}
                onChange={(e) => {
                  setSelectedGradeId(e.target.value);
                  setSelectedSubjectId('');
                  setSelectedChapterId('');
                }}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">{lang === 'am' ? '-- ክፍል ይምረጡ --' : '-- Choose Grade --'}</option>
                {curriculum.map((g) => (
                  <option key={g.id} value={g.id}>
                    {lang === 'am' ? `ክፍል ${g.level} - ${g.amharicName || g.name}` : `Grade ${g.level} - ${g.name}`}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? '፪. ትምህርት (Subject) ምረጥ' : '2. Select Subject'}
              </label>
              <Select
                disabled={!selectedGradeId}
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedChapterId('');
                }}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-xs sm:text-sm font-semibold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">{lang === 'am' ? '-- ትምህርት ይምረጡ --' : '-- Choose Subject --'}</option>
                {activeGrade?.subjects?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {pick(s.amharicName, s.name)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? '፫. ምዕራፍ ምረጥ' : '3. Select Chapter'}
              </label>
              <Select
                disabled={!selectedSubjectId}
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-xs sm:text-sm font-semibold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">{lang === 'am' ? '-- ምዕራፍ ይምረጡ --' : '-- Choose Chapter --'}</option>
                {activeChapters.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {pick(c.amharicTitle, c.title)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Form Type Selector: Reference vs Practice Question */}
          <div className="flex space-x-2 border-b border-stone-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setContributionType('REFERENCE')}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center space-x-2 cursor-pointer ${
                contributionType === 'REFERENCE'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{lang === 'am' ? 'ማጣቀሻ ሰነድ ማቅረቢያ' : 'Supplementary Reference'}</span>
            </button>

            <button
              type="button"
              onClick={() => setContributionType('PRACTICE_QUESTION')}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center space-x-2 cursor-pointer ${
                contributionType === 'PRACTICE_QUESTION'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{lang === 'am' ? 'የልምምድ ጥያቄ ማቅረቢያ' : 'Practice Questions'}</span>
            </button>
          </div>

          {/* SUB-FORM A: REFERENCE DOCUMENT */}
          {contributionType === 'REFERENCE' && (
            <form onSubmit={handleSubmitReference} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                  {lang === 'am' ? 'የሰነዱ ርዕስ *' : 'Document Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'am' ? 'ምሳሌ፡ የሐዲስ ኪዳን መግቢያ' : 'e.g. Introduction to the New Testament'}
                  value={refTitle}
                  onChange={(e) => setRefTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Source: upload a document or share a link */}
              <div className="space-y-3">
                <div className="inline-flex rounded-xl border border-stone-300 dark:border-slate-700 overflow-hidden text-xs font-bold">
                  {(['UPLOAD', 'LINK'] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setRefSource(src)}
                      className={`px-4 py-2 transition cursor-pointer ${
                        refSource === src
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {src === 'UPLOAD'
                        ? (lang === 'am' ? 'ሰነድ ጫን' : 'Upload document')
                        : (lang === 'am' ? 'አድራሻ (Link)' : 'Web link')}
                    </button>
                  ))}
                </div>

                {refSource === 'UPLOAD' ? (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                      {lang === 'am' ? 'ሰነድ (PDF, DOC, DOCX, PPT, PPTX) *' : 'Document (PDF, DOC, DOCX, PPT, PPTX) *'}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      onChange={(e) => setRefFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-stone-700 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800 file:font-bold hover:file:bg-amber-200 cursor-pointer"
                    />
                    {refFile && (
                      <p className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">
                        {refFile.name} · {(refFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">
                      {lang === 'am'
                        ? 'የተጫነው ሰነድ ከጸደቀ በኋላ ለተማሪዎች ከመስመር ውጭ ሊወርድ ይችላል።'
                        : 'Approved documents can be downloaded by students for offline reading.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                        {lang === 'am' ? 'የሰነዱ ወይም የድህረ-ገጹ አድራሻ (URL) *' : 'Document URL / Link *'}
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://example.org/patristic-reading.pdf"
                        value={refUrl}
                        onChange={(e) => setRefUrl(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDl"
                        checked={refIsDownloadable}
                        onChange={(e) => setRefIsDownloadable(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="isDl" className="text-xs font-bold text-stone-800 dark:text-slate-200 cursor-pointer">
                        {lang === 'am'
                          ? 'ይህ አድራሻ በቀጥታ የሚወርድ ሰነድ ነው (ከመስመር ውጭ)'
                          : 'This link is a direct file download (usable offline)'}
                      </label>
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedChapterId}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow transition disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{lang === 'am' ? 'ማጣቀሻውን አስገባ (Submit Reference)' : 'Submit Reference for Review'}</span>
              </button>
            </form>
          )}

          {/* SUB-FORM B: PRACTICE QUESTION */}
          {contributionType === 'PRACTICE_QUESTION' && (
            <form onSubmit={handleAddDraftQuestion} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                  {lang === 'am' ? 'የጥያቄው ዓይነት' : 'Question Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQType('MULTIPLE_CHOICE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      qType === 'MULTIPLE_CHOICE'
                        ? 'border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                        : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lang === 'am' ? 'ባለብዙ ምርጫ' : 'Multiple Choice'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setQType('TRUE_FALSE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      qType === 'TRUE_FALSE'
                        ? 'border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                        : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lang === 'am' ? 'እውነት / ሐሰት' : 'True / False'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setQType('SHORT_ANSWER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      qType === 'SHORT_ANSWER'
                        ? 'border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                        : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lang === 'am' ? 'አጭር መልስ' : 'Short Answer'}
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                  {lang === 'am' ? 'ጥያቄ *' : 'Question *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={lang === 'am' ? 'ጥያቄውን ይጻፉ...' : 'Enter the question...'}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Explanation (Optional) */}
              <div className="bg-stone-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                  {lang === 'am' ? 'ማብራሪያ (አማራጭ)' : 'Explanation (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={lang === 'am' ? 'መልሱን ሲከፍት የሚታይ ማብራሪያ...' : 'Optional explanation shown upon reveal...'}
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Dynamic Answer Structure per Type */}
              {qType === 'MULTIPLE_CHOICE' && (
                <div className="space-y-3 bg-amber-50/50 dark:bg-slate-950/50 p-4 rounded-2xl border border-amber-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-stone-800 dark:text-slate-200">
                      {lang === 'am' ? 'የምርጫ አማራጮች (ትክክለኛውን ምልክት ያድርጉ)' : 'Choices (Mark the correct answer)'}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddChoice}
                      className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 underline cursor-pointer"
                    >
                      + {lang === 'am' ? 'አማራጭ ጨምር' : 'Add Choice'}
                    </button>
                  </div>

                  {mcChoices.map((choice, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-stone-200 dark:border-slate-800">
                      <input
                        type="radio"
                        name="correctChoice"
                        checked={choice.isCorrect}
                        onChange={() => handleSetChoiceCorrect(idx)}
                        className="text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        title={lang === 'am' ? 'ትክክለኛ መልስ' : 'Correct Choice'}
                      />
                      <input
                        type="text"
                        placeholder={lang === 'am' ? `አማራጭ ${idx + 1}` : `Choice ${idx + 1}`}
                        value={choice.text}
                        onChange={(e) => handleUpdateChoiceText(idx, 'text', e.target.value)}
                        className="flex-1 p-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {mcChoices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChoice(idx)}
                          className="text-stone-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {qType === 'TRUE_FALSE' && (
                <div className="bg-amber-50/50 dark:bg-slate-950/50 p-4 rounded-2xl border border-amber-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-extrabold text-stone-800 dark:text-slate-200 block">
                    {lang === 'am' ? 'ትክክለኛው መልስ የትኛው ነው?' : 'Which answer is correct?'}
                  </span>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 text-xs font-bold text-stone-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="tfAnswer"
                        value="TRUE"
                        checked={tfCorrect === 'TRUE'}
                        onChange={() => setTfCorrect('TRUE')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{lang === 'am' ? 'እውነት (True)' : 'True'}</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-bold text-stone-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="tfAnswer"
                        value="FALSE"
                        checked={tfCorrect === 'FALSE'}
                        onChange={() => setTfCorrect('FALSE')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{lang === 'am' ? 'ሐሰት (False)' : 'False'}</span>
                    </label>
                  </div>
                </div>
              )}

              {qType === 'SHORT_ANSWER' && (
                <div className="bg-amber-50/50 dark:bg-slate-950/50 p-4 rounded-2xl border border-amber-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-extrabold text-stone-800 dark:text-slate-200 block">
                    {lang === 'am' ? 'የሚጠበቀው አጭር መልስ (ተማሪው «መልስ አሳይ» ሲል የሚገለጥ - አማራጭ)' : 'Expected Answer (Shown when student clicks "Show Answer" - Optional)'}
                  </span>
                    <input
                      type="text"
                      placeholder={lang === 'am' ? 'መልስ (አማራጭ)' : 'Answer (optional)'}
                      value={saAnswer}
                      onChange={(e) => setSaAnswer(e.target.value)}
                      className="w-full p-2 rounded-lg border border-stone-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-950 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedChapterId}
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm shadow transition disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{lang === 'am' ? 'ወደ ዝርዝሩ ጨምር' : 'Add to list'}</span>
              </button>
            </form>
          )}

          {/* Prepared questions: sent together for review */}
          {contributionType === 'PRACTICE_QUESTION' && draftQuestions.length > 0 && (
            <div className="max-w-2xl rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                    {lang === 'am'
                      ? `ለመላክ ዝግጁ የሆኑ ጥያቄዎች (${draftQuestions.length})`
                      : `Ready to send (${draftQuestions.length})`}
                  </h4>
                  {draftChapterLabel && (
                    <p className="text-[11px] text-stone-600 dark:text-slate-400 mt-0.5">
                      {lang === 'am' ? 'ምዕራፍ፡ ' : 'Chapter: '}
                      <span className="font-semibold">{draftChapterLabel}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDiscardDrafts}
                  disabled={submitting}
                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {lang === 'am' ? 'ሁሉንም አስወግድ' : 'Discard all'}
                </button>
              </div>

              <ol className="space-y-2">
                {draftQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-2.5"
                  >
                    <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-900 dark:text-white line-clamp-2">{q.prompt}</p>
                      <p className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">{q.questionType}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDraft(i)}
                      disabled={submitting}
                      aria-label={lang === 'am' ? 'አስወግድ' : 'Remove'}
                      className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ol>

              <button
                type="button"
                onClick={handleSendDraftsForReview}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {lang === 'am'
                    ? `ለግምገማ ላክ (${draftQuestions.length})`
                    : `Send ${draftQuestions.length} for review`}
                </span>
              </button>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'ሁሉም ጥያቄዎች በአንድ ጊዜ ወደ አስተዳዳሪ ይላካሉ።'
                  : 'All questions are delivered to the admin together as one review request.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MY SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              {lang === 'am' ? 'ያቀረቧቸው ማጣቀሻዎችና የልምምድ ጥያቄዎች' : 'Your Contributed Items & Review Status'}
            </h3>
            <span className="text-xs text-stone-500 dark:text-slate-400">
              {submissions.references.length + submissions.practiceQuestions.length} {lang === 'am' ? 'ንጥሎች' : 'items'}
            </span>
          </div>

          {/* Practice Questions Submissions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400">
              {lang === 'am' ? 'የልምምድ ጥያቄዎች (Practice Questions)' : 'Practice Questions'}
            </h4>
            {submissions.practiceQuestions.length === 0 ? (
              <p className="text-xs text-stone-400 dark:text-slate-500 italic bg-white dark:bg-slate-900 p-4 rounded-xl border border-stone-200 dark:border-slate-800">
                {lang === 'am' ? 'ምንም ያቀረቡት የልምምድ ጥያቄ የለም።' : 'No practice questions submitted yet.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {submissions.practiceQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                            {q.questionType}
                          </span>
                          <span className="text-xs font-bold text-stone-900 dark:text-white break-words min-w-0">
                            {q.prompt}
                          </span>
                        </div>
                        {q.explanation && (
                          <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1 italic break-words">
                            {lang === 'am' ? 'ማብራሪያ: ' : 'Explanation: '}
                            {q.explanation}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {q.status === 'APPROVED' && (
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{lang === 'am' ? 'የጸደቀ' : 'Approved'}</span>
                          </span>
                        )}
                        {q.status === 'PENDING_REVIEW' && (
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>{lang === 'am' ? 'በግምገማ ላይ' : 'Pending'}</span>
                          </span>
                        )}
                        {q.status === 'REJECTED' && (
                          <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            <span>{lang === 'am' ? 'የተመለሰ' : 'Declined'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {q.status === 'REJECTED' && q.rejectionReason && (
                      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-2.5 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            {lang === 'am' ? 'የአስተዳዳሪ ግብረ-መልስ / ምክንያት:' : 'Admin Rejection Reason:'}
                          </span>
                          <span>{q.rejectionReason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* References Submissions */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400">
              {lang === 'am' ? 'ማጣቀሻ ሰነዶች (References)' : 'Supplementary References'}
            </h4>
            {submissions.references.length === 0 ? (
              <p className="text-xs text-stone-400 dark:text-slate-500 italic bg-white dark:bg-slate-900 p-4 rounded-xl border border-stone-200 dark:border-slate-800">
                {lang === 'am' ? 'ምንም ያቀረቡት ማጣቀሻ የለም።' : 'No reference materials submitted yet.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {submissions.references.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white break-words">
                          {r.title}
                        </h5>
                        <a
                          href={r.downloadableDocUrl || r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline flex items-center space-x-1 mt-0.5 max-w-full min-w-0"
                        >
                          <span className="truncate min-w-0">
                            {r.downloadableDocUrl ? (lang === 'am' ? 'የተጫነ ሰነድ ክፈት' : 'Open uploaded document') : r.url}
                          </span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>

                      <div className="shrink-0">
                        {r.status === 'APPROVED' && (
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{lang === 'am' ? 'የጸደቀ' : 'Approved'}</span>
                          </span>
                        )}
                        {r.status === 'PENDING_REVIEW' && (
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>{lang === 'am' ? 'በግምገማ ላይ' : 'Pending'}</span>
                          </span>
                        )}
                        {r.status === 'REJECTED' && (
                          <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            <span>{lang === 'am' ? 'የተመለሰ' : 'Declined'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {r.status === 'REJECTED' && r.rejectionReason && (
                      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-2.5 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            {lang === 'am' ? 'የአስተዳዳሪ ግብረ-መልስ / ምክንያት:' : 'Admin Rejection Reason:'}
                          </span>
                          <span>{r.rejectionReason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
