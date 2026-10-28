'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Layers,
  FileEdit,
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  FileText,
  HelpCircle,
  Link2,
  Search,
  Sparkles,
  Upload,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

function AdminCurriculumContent() {
  const searchParams = useSearchParams();
  const targetGradeId = searchParams.get('grade');
  const targetSubjectId = searchParams.get('subject');

  const { lang, pick } = useLanguage();
  const [grades, setGrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Creation Modals
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeForm, setGradeForm] = useState({ level: 1, name: '', amharicName: '', description: '' });

  const [activeGradeIdForSubject, setActiveGradeIdForSubject] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', amharicName: '', code: '', description: '' });

  const [activeSubjectIdForChapter, setActiveSubjectIdForChapter] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState({ chapterNumber: 1, title: '', amharicTitle: '', description: '' });

  // Draft State Editing Modals
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({
    name: '',
    amharicName: '',
    code: '',
    description: '',
    textbookTotalPages: 100,
  });

  const [editingChapter, setEditingChapter] = useState<any | null>(null);
  const [editChapterForm, setEditChapterForm] = useState({
    chapterNumber: 1,
    title: '',
    amharicTitle: '',
    description: '',
  });

  // Master Textbook Upload State
  const [uploadingSubjectId, setUploadingSubjectId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCurriculum = async () => {
    try {
      setIsLoading(true);
      await api.init();
      const data = await api.getAdminCurriculum();
      const sorted = (data || []).sort((a: any, b: any) => a.level - b.level);
      setGrades(sorted);

      const expanded: Record<string, boolean> = {};
      sorted.forEach((g: any) => {
        expanded[g.id] = true;
      });
      if (targetGradeId) {
        expanded[targetGradeId] = true;
      }
      setExpandedGrades(expanded);

      if (targetSubjectId) {
        setTimeout(() => {
          const el = document.getElementById(`subject-${targetSubjectId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-amber-500');
            setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 3000);
          }
        }, 300);
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ስርዓተ ትምህርቱን መጫን አልተቻለም' : 'Failed to load curriculum'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, [targetGradeId, targetSubjectId]);

  const toggleGrade = (gradeId: string) => {
    setExpandedGrades((prev) => ({ ...prev, [gradeId]: !prev[gradeId] }));
  };

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createGrade({
        level: Number(gradeForm.level),
        name: gradeForm.name,
        amharicName: gradeForm.amharicName || undefined,
        description: gradeForm.description || undefined,
      });
      setShowGradeModal(false);
      setGradeForm({ level: 1, name: '', amharicName: '', description: '' });
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'አዲስ ክፍል በተሳካ ሁኔታ ተፈጥሯል!' : 'Grade created successfully!',
      });
      await loadCurriculum();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ክፍል መፍጠር አልተቻለም' : 'Failed to create grade'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGradeIdForSubject) return;
    try {
      setIsSubmitting(true);
      await api.createSubject(activeGradeIdForSubject, {
        name: subjectForm.name,
        amharicName: subjectForm.amharicName || undefined,
        code: subjectForm.code.toUpperCase(),
        description: subjectForm.description || undefined,
      });
      setActiveGradeIdForSubject(null);
      setSubjectForm({ name: '', amharicName: '', code: '', description: '' });
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'የትምህርት ዓይነት በተሳካ ሁኔታ ተፈጥሯል!' : 'Subject created successfully!',
      });
      await loadCurriculum();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'የትምህርት ዓይነት መፍጠር አልተቻለም' : 'Failed to create subject'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    try {
      setIsSubmitting(true);
      await api.updateSubject(editingSubject.id, {
        name: editSubjectForm.name,
        amharicName: editSubjectForm.amharicName || undefined,
        code: editSubjectForm.code.toUpperCase(),
        description: editSubjectForm.description || undefined,
        textbookTotalPages: Number(editSubjectForm.textbookTotalPages) || undefined,
      });
      setEditingSubject(null);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'የትምህርት ዓይነት በተሳካ ሁኔታ ተሻሽሏል!' : 'Subject updated successfully!',
      });
      await loadCurriculum();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'የትምህርት ዓይነት ማሻሻል አልተቻለም' : 'Failed to update subject'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubjectIdForChapter) return;
    try {
      setIsSubmitting(true);
      await api.createChapter(activeSubjectIdForChapter, {
        chapterNumber: Number(chapterForm.chapterNumber),
        title: chapterForm.title,
        amharicTitle: chapterForm.amharicTitle || undefined,
        description: chapterForm.description || undefined,
      });
      setActiveSubjectIdForChapter(null);
      setChapterForm({ chapterNumber: 1, title: '', amharicTitle: '', description: '' });
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'ምዕራፍ በተሳካ ሁኔታ ተፈጥሯል!' : 'Chapter created successfully!',
      });
      await loadCurriculum();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ምዕራፍ መፍጠር አልተቻለም' : 'Failed to create chapter'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;
    try {
      setIsSubmitting(true);
      await api.updateChapter(editingChapter.id, {
        chapterNumber: Number(editChapterForm.chapterNumber),
        title: editChapterForm.title,
        amharicTitle: editChapterForm.amharicTitle || undefined,
        description: editChapterForm.description || undefined,
      });
      setEditingChapter(null);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'የምዕራፍ መረጃ በተሳካ ሁኔታ ተሻሽሏል!' : 'Chapter updated successfully!',
      });
      await loadCurriculum();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ምዕራፍ ማሻሻል አልተቻለም' : 'Failed to update chapter'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string, title: string) => {
    const confirmMsg =
      lang === 'am'
        ? `እርግጠኛ ነዎት ምዕራፍ "${title}" እንዲሰረዝ ይፈልጋሉ? የተያያዙ መጽሐፎችና ፈተናዎች አብረው ይሰረዛሉ።`
        : `Are you sure you want to delete chapter "${title}"? Attached textbooks and quizzes will also be deleted.`;
    if (!confirm(confirmMsg)) return;

    try {
      setIsSubmitting(true);
      await api.deleteChapter(chapterId);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? `ምዕራፍ "${title}" በተሳካ ሁኔታ ተሰርዟል!` : `Chapter "${title}" deleted successfully!`,
      });
      await loadCurriculum();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ምዕራፉን መሰረዝ አልተቻለም' : 'Failed to delete chapter'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Master Textbook Upload for Subject
  const handleUploadSubjectMasterTextbook = async (subjectId: string, file: File) => {
    try {
      setUploadingSubjectId(subjectId);
      const res = await api.uploadPdf(file, 'textbook');
      await api.updateSubject(subjectId, {
        textbookUrl: res.fileUrl,
        textbookFileName: file.name,
        textbookFileSize: res.fileSize,
        textbookChecksumSha256: res.checksumSha256,
        textbookTotalPages: 100,
      });
      setActionMessage({
        type: 'success',
        text:
          lang === 'am'
            ? `የትምህርቱ ዋና መጽሐፍ "${file.name}" በተሳካ ሁኔታ ተጭኗል!`
            : `Subject master textbook "${file.name}" uploaded successfully!`,
      });
      await loadCurriculum();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ዋና መጽሐፍ መጫን አልተቻለም' : 'Failed to upload master textbook'),
      });
    } finally {
      setUploadingSubjectId(null);
    }
  };

  // Advanced Search & Filter Logic
  const q = searchQuery.toLowerCase().trim();
  const filteredGrades = grades
    .filter((g) => (selectedGradeLevel === 'ALL' ? true : g.level === selectedGradeLevel))
    .map((grade) => {
      if (!q) return grade;
      const gradeMatches =
        grade.name?.toLowerCase().includes(q) ||
        grade.amharicName?.toLowerCase().includes(q) ||
        String(grade.level).includes(q);

      const matchingSubjects = (grade.subjects || []).filter((sub: any) => {
        const subMatches =
          sub.name?.toLowerCase().includes(q) ||
          sub.amharicName?.toLowerCase().includes(q) ||
          sub.code?.toLowerCase().includes(q) ||
          sub.description?.toLowerCase().includes(q);

        const chMatches = (sub.chapters || []).some(
          (ch: any) =>
            ch.title?.toLowerCase().includes(q) ||
            ch.amharicTitle?.toLowerCase().includes(q) ||
            ch.description?.toLowerCase().includes(q)
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
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Layers className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>{lang === 'am' ? 'ስርዓተ ትምህርት አስተዳደር' : 'Curriculum Management'}</span>
          </h1>
          <p className="text-stone-500 dark:text-slate-400 text-sm mt-1">
            {lang === 'am'
              ? 'የትምህርት ክፍሎችን፣ ዓይነቶችንና ምዕራፎችን ማደራጀት፣ ዋና መጽሐፍትን በገጽ መከፋፈል'
              : 'Organize grades, subjects, chapters, and divide master textbooks by page'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/ai"
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 font-bold rounded-lg text-sm border border-stone-300 dark:border-slate-700 shadow-xs transition"
          >
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{lang === 'am' ? 'አይአይ ረዳት ስቱዲዮ' : 'AI Curriculum Studio'}</span>
          </Link>

          <button
            onClick={() => setShowGradeModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'am' ? 'አዲስ ክፍል ጨምር' : 'Add Grade'}</span>
          </button>
        </div>
      </div>

      {/* Advanced Search & Topic Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-3 rounded-xl flex items-center space-x-3 shadow-xs">
        <Search className="w-5 h-5 text-stone-400 dark:text-slate-400 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            lang === 'am'
              ? 'በርዕሰ ጉዳይ፣ በምዕራፍ ርዕስ ወይም በኮድ ይፈልጉ... (ምሳሌ፡ Church History ወይም HIST)'
              : 'Search by subject topic, chapter title, or code... (e.g. Church History or HIST)'
          }
          className="w-full bg-transparent text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white px-2 py-1 bg-stone-100 dark:bg-slate-800 rounded transition"
          >
            {lang === 'am' ? 'አጥፋ' : 'Clear'}
          </button>
        )}
      </div>

      {/* Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white"
          >
            {lang === 'am' ? 'ዝጋ' : 'Close'}
          </button>
        </div>
      )}

      {/* Grade Quick Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedGradeLevel('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedGradeLevel === 'ALL'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {lang === 'am' ? 'ሁሉም ክፍሎች' : 'All Grades'}
        </button>
        {grades.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setSelectedGradeLevel(g.level);
              setExpandedGrades((prev) => ({ ...prev, [g.id]: true }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedGradeLevel === g.level
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {pick(g.amharicName, g.name)}
          </button>
        ))}
      </div>

      {/* Curriculum Tree Accordion */}
      {isLoading ? (
        <div className="p-12 text-center text-stone-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl flex items-center justify-center space-x-2 shadow-xs">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500 dark:text-amber-400" />
          <span>{lang === 'am' ? 'ስርዓተ ትምህርቱን በመጫን ላይ...' : 'Loading curriculum...'}</span>
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="p-12 text-center text-stone-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl shadow-xs">
          <BookOpen className="w-10 h-10 text-stone-300 dark:text-slate-600 mx-auto mb-3" />
          <p>
            {searchQuery
              ? (lang === 'am' ? `"${searchQuery}" የሚል ውጤት አልተገኘም።` : `No results found for "${searchQuery}".`)
              : (lang === 'am' ? 'ምንም የተመዘገበ ክፍል አልተገኘም።' : 'No grades registered yet.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGrades.map((grade: any) => {
            const isExpanded = expandedGrades[grade.id] ?? false;
            return (
              <div
                key={grade.id}
                className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition"
              >
                {/* Grade Header */}
                <div
                  onClick={() => toggleGrade(grade.id)}
                  className="p-4 bg-white hover:bg-stone-50 dark:bg-slate-900 dark:hover:bg-slate-850 cursor-pointer flex items-center justify-between border-b border-stone-200 dark:border-slate-800/80 select-none transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
                      {grade.level}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 dark:text-white text-base">
                        {pick(grade.amharicName, grade.name)}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-stone-600 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-medium">
                      {(grade.subjects || []).length} {lang === 'am' ? 'የትምህርት ዓይነቶች' : 'Subjects'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-stone-400 dark:text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-stone-400 dark:text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Grade Content (Subjects & Chapters) */}
                {isExpanded && (
                  <div className="p-5 space-y-6 bg-stone-50/50 dark:bg-slate-950/40">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-200 dark:border-slate-800/60">
                      <span className="text-xs font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider">
                        {lang === 'am' ? 'የትምህርት ዓይነቶች' : 'Subjects'} ({lang === 'am' ? `ክፍል ${grade.level}` : `Grade ${grade.level}`})
                      </span>
                      <button
                        onClick={() => {
                          setActiveGradeIdForSubject(grade.id);
                          setSubjectForm({ name: '', amharicName: '', code: '', description: '' });
                        }}
                        className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{lang === 'am' ? 'አዲስ የትምህርት ዓይነት ጨምር' : 'Add Subject'}</span>
                      </button>
                    </div>

                    {(grade.subjects || []).length === 0 ? (
                      <p className="text-xs text-stone-400 dark:text-slate-500 italic py-2">
                        {lang === 'am' ? 'ለዚህ ክፍል የተመዘገበ የትምህርት ዓይነት የለም።' : 'No subjects registered for this grade.'}
                      </p>
                    ) : (
                      <div className="space-y-5">
                        {grade.subjects.map((subject: any) => (
                          <div
                            key={subject.id}
                            id={`subject-${subject.id}`}
                            className="bg-white dark:bg-slate-900/90 border border-stone-200 dark:border-slate-800 rounded-lg p-4 space-y-4 shadow-2xs transition"
                          >
                            {/* Subject Header & Master Textbook Info */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-slate-800/60">
                              <div className="flex items-center space-x-3">
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-amber-800 dark:text-amber-300 font-semibold border border-stone-200 dark:border-transparent">
                                  {subject.code}
                                </span>
                                <div>
                                  <h4 className="font-bold text-sm text-stone-900 dark:text-slate-100 flex items-center space-x-2">
                                    <span>{pick(subject.amharicName, subject.name)}</span>
                                    <button
                                      onClick={() => {
                                        setEditingSubject(subject);
                                        setEditSubjectForm({
                                          name: subject.name || '',
                                          amharicName: subject.amharicName || '',
                                          code: subject.code || '',
                                          description: subject.description || '',
                                          textbookTotalPages: subject.textbookTotalPages || 100,
                                        });
                                      }}
                                      className="p-1 text-stone-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400 transition cursor-pointer"
                                      title={lang === 'am' ? 'የትምህርት ዓይነት አሻሽል' : 'Edit Subject'}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </h4>
                                </div>
                              </div>

                              {/* Master Textbook Status & Upload */}
                              <div className="flex flex-wrap items-center gap-2">
                                {subject.textbookUrl ? (
                                  <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-slate-950 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800/70 text-[11px]">
                                    <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span className="text-emerald-800 dark:text-emerald-300 font-medium truncate max-w-[140px]" title={subject.textbookFileName || 'Master Textbook'}>
                                      {subject.textbookFileName || (lang === 'am' ? 'ዋና መጽሐፍ' : 'Master Textbook')}
                                    </span>
                                    <span className="text-stone-500 dark:text-slate-400 font-mono">
                                      ({subject.textbookTotalPages || 100}p)
                                    </span>
                                    <a
                                      href={subject.textbookUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 ml-1"
                                      title={lang === 'am' ? 'ፒዲኤፉን እይ' : 'View PDF'}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-stone-500 dark:text-slate-500 bg-stone-100 dark:bg-slate-950 px-2 py-1 rounded border border-stone-200 dark:border-slate-800">
                                    {lang === 'am' ? 'ዋና መጽሐፍ አልተጫነም' : 'No Master Textbook'}
                                  </span>
                                )}

                                {/* Upload / Replace Master Textbook Button */}
                                <label className="text-xs bg-stone-100 hover:bg-stone-200 text-amber-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 flex items-center space-x-1 cursor-pointer transition">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    disabled={uploadingSubjectId === subject.id}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadSubjectMasterTextbook(subject.id, file);
                                    }}
                                  />
                                  {uploadingSubjectId === subject.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin text-amber-500 dark:text-amber-400" />
                                      <span>{lang === 'am' ? 'በመጫን ላይ...' : 'Uploading...'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-3 h-3" />
                                      <span>
                                        {subject.textbookUrl
                                          ? (lang === 'am' ? 'መጽሐፍ ቀይር' : 'Change PDF')
                                          : (lang === 'am' ? 'ዋና መጽሐፍ ስቀል' : 'Upload Master PDF')}
                                      </span>
                                    </>
                                  )}
                                </label>

                                <button
                                  onClick={() => {
                                    setActiveSubjectIdForChapter(subject.id);
                                    setChapterForm({
                                      chapterNumber: (subject.chapters?.length || 0) + 1,
                                      title: '',
                                      amharicTitle: '',
                                      description: '',
                                    });
                                  }}
                                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-500/30 flex items-center space-x-1 transition cursor-pointer"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>{lang === 'am' ? 'ምዕራፍ ጨምር' : 'Add Chapter'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Chapters inside Subject */}
                            <div className="pl-1 space-y-2">
                              {(subject.chapters || []).length === 0 ? (
                                <p className="text-xs text-stone-400 dark:text-slate-500 italic py-1">
                                  {lang === 'am'
                                    ? 'ምንም ምዕራፍ አልተጨመረም። "ምዕራፍ ጨምር" የሚለውን ይጫኑ።'
                                    : 'No chapters added yet. Click "Add Chapter".'}
                                </p>
                              ) : (
                                subject.chapters.map((ch: any) => (
                                  <div
                                    key={ch.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800/80 hover:border-stone-300 dark:hover:border-slate-750 transition gap-3"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 font-bold">
                                        #{ch.chapterNumber}
                                      </span>
                                      <div>
                                        <h5 className="text-xs font-semibold text-stone-900 dark:text-white flex items-center space-x-1.5">
                                          <span>{pick(ch.amharicTitle, ch.title)}</span>
                                          {!ch.isPublished && (
                                            <button
                                              onClick={() => {
                                                setEditingChapter(ch);
                                                setEditChapterForm({
                                                  chapterNumber: ch.chapterNumber,
                                                  title: ch.title || '',
                                                  amharicTitle: ch.amharicTitle || '',
                                                  description: ch.description || '',
                                                });
                                              }}
                                              className="p-0.5 text-stone-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400 transition cursor-pointer"
                                              title={lang === 'am' ? 'ምዕራፍ አሻሽል' : 'Edit Chapter'}
                                            >
                                              <Edit3 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </h5>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* Status */}
                                      {ch.isPublished ? (
                                        <span className="flex items-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          {lang === 'am' ? `የታተመ (v${ch.version})` : `Published (v${ch.version})`}
                                        </span>
                                      ) : (
                                        <span className="flex items-center text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                                          <Clock className="w-3 h-3 mr-1" />
                                          {lang === 'am' ? 'ረቂቅ' : 'Draft'}
                                        </span>
                                      )}

                                      {/* PDF Status Chip */}
                                      {ch.textbook ? (
                                        <span className="flex items-center text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded">
                                          <FileText className="w-3 h-3 mr-1" />
                                          PDF ({ch.textbook.startPage}-{ch.textbook.endPage})
                                        </span>
                                      ) : (
                                        <span className="flex items-center text-[10px] text-stone-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 px-2 py-0.5 rounded">
                                          <FileText className="w-3 h-3 mr-1" />
                                          {lang === 'am' ? 'PDF የለም' : 'No PDF'}
                                        </span>
                                      )}

                                      {/* Quiz Status Chip */}
                                      {ch.quizzes && ch.quizzes.length > 0 ? (
                                        <span className="flex items-center text-[10px] text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 px-2 py-0.5 rounded">
                                          <HelpCircle className="w-3 h-3 mr-1" />
                                          {ch.quizzes[0].questions?.length || 0} {lang === 'am' ? 'ጥያቄዎች' : 'Questions'}
                                        </span>
                                      ) : (
                                        <span className="flex items-center text-[10px] text-stone-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 px-2 py-0.5 rounded">
                                          <HelpCircle className="w-3 h-3 mr-1" />
                                          {lang === 'am' ? 'ፈተና የለም' : 'No Quiz'}
                                        </span>
                                      )}

                                      {/* References Chip */}
                                      {ch.references && ch.references.length > 0 ? (
                                        <span className="flex items-center text-[10px] text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded">
                                          <Link2 className="w-3 h-3 mr-1" />
                                          {ch.references.length} {lang === 'am' ? 'ማጣቀሻ' : 'References'}
                                        </span>
                                      ) : null}

                                      {/* Studio Link Button */}
                                      <Link
                                        href={`/admin/chapters/${ch.id}`}
                                        className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 font-semibold rounded border border-amber-200 dark:border-amber-500/30 flex items-center space-x-1 transition ml-1"
                                      >
                                        <FileEdit className="w-3.5 h-3.5" />
                                        <span>{lang === 'am' ? 'ይዘት አዘጋጅ' : 'Studio'}</span>
                                      </Link>

                                      {/* Delete Chapter Button */}
                                      <button
                                        onClick={() => handleDeleteChapter(ch.id, pick(ch.amharicTitle, ch.title))}
                                        className="p-1 text-stone-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer"
                                        title={lang === 'am' ? 'ምዕራፉን ሰርዝ' : 'Delete Chapter'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE GRADE MODAL */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'አዲስ ክፍል ጨምር' : 'Add Grade'}</span>
            </h2>
            <form onSubmit={handleCreateGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ደረጃ / ቁጥር (1-12)' : 'Grade Level (1-12)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={gradeForm.level}
                  onChange={(e) => setGradeForm({ ...gradeForm, level: Number(e.target.value) })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የክፍል ስም በእንግሊዝኛ' : 'Grade Name (English)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Grade 6"
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የክፍል ስም በአማርኛ' : 'Grade Name (Amharic)'}
                </label>
                <input
                  type="text"
                  placeholder="ክፍል ፮"
                  value={gradeForm.amharicName}
                  onChange={(e) => setGradeForm({ ...gradeForm, amharicName: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition cursor-pointer"
                >
                  {lang === 'am' ? 'ፍጠር' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {activeGradeIdForSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'አዲስ የትምህርት ዓይነት መዝግብ' : 'Add Subject'}</span>
            </h2>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የትምህርት ዓይነት ኮድ' : 'Subject Code'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'am' ? 'ለምሳሌ፡ HIST-G6' : 'e.g. HIST-G6'}
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ስም በእንግሊዝኛ' : 'Subject Name (English)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Church History"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ስም በአማርኛ' : 'Subject Name (Amharic)'}
                </label>
                <input
                  type="text"
                  placeholder="ታሪከ ቤተ ክርስቲያን"
                  value={subjectForm.amharicName}
                  onChange={(e) => setSubjectForm({ ...subjectForm, amharicName: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveGradeIdForSubject(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition cursor-pointer"
                >
                  {lang === 'am' ? 'ፍጠር' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBJECT MODAL (DRAFT STATE EDITING) */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'የትምህርት ዓይነት አሻሽል' : 'Edit Subject'}</span>
            </h2>
            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የትምህርት ዓይነት ኮድ' : 'Subject Code'}
                </label>
                <input
                  type="text"
                  required
                  value={editSubjectForm.code}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, code: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ስም በእንግሊዝኛ' : 'Subject Name (English)'}
                </label>
                <input
                  type="text"
                  required
                  value={editSubjectForm.name}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ስም በአማርኛ' : 'Subject Name (Amharic)'}
                </label>
                <input
                  type="text"
                  value={editSubjectForm.amharicName}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, amharicName: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የመጽሐፍ ጠቅላላ ገጾች' : 'Master Textbook Total Pages'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={editSubjectForm.textbookTotalPages}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, textbookTotalPages: Number(e.target.value) })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition cursor-pointer"
                >
                  {lang === 'am' ? 'አስቀምጥ' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CHAPTER MODAL */}
      {activeSubjectIdForChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'አዲስ ምዕራፍ ጨምር' : 'Add Chapter'}</span>
            </h2>
            <form onSubmit={handleCreateChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የምዕራፍ ቁጥር' : 'Chapter Number'}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={chapterForm.chapterNumber}
                  onChange={(e) => setChapterForm({ ...chapterForm, chapterNumber: Number(e.target.value) })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ርዕስ በእንግሊዝኛ' : 'Title (English)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="The Early Church"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ርዕስ በአማርኛ' : 'Title (Amharic)'}
                </label>
                <input
                  type="text"
                  placeholder="ምዕራፍ ፩: የቀደምት ቤተ ክርስቲያን ታሪክ"
                  value={chapterForm.amharicTitle}
                  onChange={(e) => setChapterForm({ ...chapterForm, amharicTitle: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubjectIdForChapter(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition cursor-pointer"
                >
                  {lang === 'am' ? 'ፍጠር' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CHAPTER MODAL (DRAFT STATE EDITING) */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'ምዕራፍ አሻሽል (ረቂቅ)' : 'Edit Chapter (Draft)'}</span>
            </h2>
            <form onSubmit={handleUpdateChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የምዕራፍ ቁጥር' : 'Chapter Number'}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editChapterForm.chapterNumber}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, chapterNumber: Number(e.target.value) })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ርዕስ በእንግሊዝኛ' : 'Title (English)'}
                </label>
                <input
                  type="text"
                  required
                  value={editChapterForm.title}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, title: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ርዕስ በአማርኛ' : 'Title (Amharic)'}
                </label>
                <input
                  type="text"
                  value={editChapterForm.amharicTitle}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, amharicTitle: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition cursor-pointer"
                >
                  {lang === 'am' ? 'አስቀምጥ' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCurriculumPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <span>Loading...</span>
        </div>
      }
    >
      <AdminCurriculumContent />
    </Suspense>
  );
}
