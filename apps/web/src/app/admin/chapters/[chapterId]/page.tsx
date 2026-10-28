'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowLeft,
  HelpCircle,
  Link2,
  FileCheck,
  PlusCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sliders,
  Upload,
  Trash2,
  ExternalLink,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

export default function AdminChapterStudioPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;
  const { lang, pick } = useLanguage();

  const [chapter, setChapter] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Textbook Form State & Upload State
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadedPdfFileName, setUploadedPdfFileName] = useState<string | null>(null);
  const [textbookForm, setTextbookForm] = useState({
    title: '',
    fileUrl: '',
    fileSize: 5242880, // default ~5MB
    checksumSha256: 'manual-sha256-hash',
    mimeType: 'application/pdf',
    startPage: 1,
    endPage: 20,
    totalPages: 100,
  });
  const [isSavingTextbook, setIsSavingTextbook] = useState(false);

  // Quiz Form State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: 'Chapter Practice Quiz',
    amharicTitle: 'የምዕራፍ ልምምድ ፈተና',
    description: 'በምዕራፉ የተማሯቸውን ትምህርቶች ይገምግሙ',
    passingScore: 75,
  });

  // Question Form State (Default at least 4 choices, dynamically add/remove)
  const initialQuestionState = {
    prompt: '',
    amharicPrompt: '',
    points: 10,
    explanation: '',
    choices: [
      { text: '', amharicText: '', isCorrect: true, orderIndex: 1 },
      { text: '', amharicText: '', isCorrect: false, orderIndex: 2 },
      { text: '', amharicText: '', isCorrect: false, orderIndex: 3 },
      { text: '', amharicText: '', isCorrect: false, orderIndex: 4 },
    ],
  };
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(initialQuestionState);

  const handleAddChoice = () => {
    setQuestionForm((prev) => ({
      ...prev,
      choices: [
        ...prev.choices,
        { text: '', amharicText: '', isCorrect: false, orderIndex: prev.choices.length + 1 },
      ],
    }));
  };

  const handleRemoveChoice = (indexToRemove: number) => {
    if (questionForm.choices.length <= 2) return;
    setQuestionForm((prev) => {
      const updated = prev.choices.filter((_, idx) => idx !== indexToRemove);
      const hasCorrect = updated.some((c) => c.isCorrect);
      if (!hasCorrect && updated.length > 0 && updated[0]) {
        updated[0].isCorrect = true;
      }
      return {
        ...prev,
        choices: updated.map((c, i) => ({ ...c, orderIndex: i + 1 })),
      };
    });
  };

  // Reference Form State & Upload State
  const [isUploadingRefDoc, setIsUploadingRefDoc] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceForm, setReferenceForm] = useState({
    title: '',
    amharicTitle: '',
    url: '',
    isDownloadable: false,
    downloadableDocUrl: '',
    downloadableDocSize: 204800,
    downloadableDocChecksum: 'ref-doc-checksum',
  });

  // Draft State Editing for Chapter
  const [showEditChapterModal, setShowEditChapterModal] = useState(false);
  const [editChapterForm, setEditChapterForm] = useState({
    chapterNumber: 1,
    title: '',
    amharicTitle: '',
    description: '',
  });

  const handleUpdateChapterDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateChapter(chapterId, {
        chapterNumber: Number(editChapterForm.chapterNumber),
        title: editChapterForm.title,
        amharicTitle: editChapterForm.amharicTitle || undefined,
        description: editChapterForm.description || undefined,
      });
      setShowEditChapterModal(false);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'የምዕራፍ መረጃ በተሳካ ሁኔታ ተሻሽሏል!' : 'Chapter details updated successfully!',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ማሻሻል አልተቻለም' : 'Failed to update chapter details'),
      });
    }
  };

  const loadChapterData = async () => {
    try {
      setIsLoading(true);
      await api.init();
      const data = await api.getChapterById(chapterId);
      setChapter(data);

      if (data.textbook) {
        setTextbookForm({
          title: data.textbook.title || '',
          fileUrl: data.textbook.fileUrl || '',
          fileSize: data.textbook.fileSize || 5242880,
          checksumSha256: data.textbook.checksumSha256 || 'manual-sha256-hash',
          mimeType: data.textbook.mimeType || 'application/pdf',
          startPage: data.textbook.startPage || 1,
          endPage: data.textbook.endPage || 20,
          totalPages: data.textbook.totalPages || 100,
        });
        if (data.textbook.fileUrl) {
          const parts = data.textbook.fileUrl.split('/');
          setUploadedPdfFileName(parts[parts.length - 1] || 'Attached PDF');
        }
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'የምዕራፉን መረጃ መጫን አልተቻለም' : 'Failed to load chapter'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chapterId) loadChapterData();
  }, [chapterId]);

  // Handle PDF Upload for Textbook
  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPdf(true);
      const res = await api.uploadPdf(file, 'textbook');
      setTextbookForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.pdf$/i, ''),
        fileUrl: res.fileUrl,
        fileSize: res.fileSize,
        checksumSha256: res.checksumSha256,
        mimeType: res.mimeType || 'application/pdf',
      }));
      setUploadedPdfFileName(file.name);
      setActionMessage({
        type: 'success',
        text:
          lang === 'am'
            ? `ፒዲኤፍ "${file.name}" በተሳካ ሁኔታ ተጭኗል! መጠን: ${(res.fileSize / (1024 * 1024)).toFixed(2)} MB`
            : `PDF "${file.name}" uploaded successfully! Size: ${(res.fileSize / (1024 * 1024)).toFixed(2)} MB`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ፒዲኤፍ መጫን አልተቻለም' : 'Failed to upload PDF'),
      });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Handle Reference Doc Upload
  const handleReferenceDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingRefDoc(true);
      const res = await api.uploadPdf(file, 'reference');
      setReferenceForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.pdf$/i, ''),
        url: res.fileUrl,
        downloadableDocUrl: res.fileUrl,
        downloadableDocSize: res.fileSize,
        downloadableDocChecksum: res.checksumSha256,
      }));
      setActionMessage({
        type: 'success',
        text:
          lang === 'am'
            ? `የማጣቀሻ ፒዲኤፍ "${file.name}" በተሳካ ሁኔታ ተጭኗል!`
            : `Reference PDF "${file.name}" uploaded successfully!`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'የማጣቀሻ ፋይል መጫን አልተቻለም' : 'Failed to upload reference file'),
      });
    } finally {
      setIsUploadingRefDoc(false);
    }
  };

  // Handle Save Textbook
  const handleSaveTextbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textbookForm.fileUrl) {
      setActionMessage({
        type: 'error',
        text:
          lang === 'am'
            ? 'እባክዎ መጀመሪያ ፒዲኤፍ ፋይል ይጫኑ ወይም የፋይል ሊንክ ያስገቡ'
            : 'Please upload a PDF file or enter a valid file URL first',
      });
      return;
    }
    try {
      setIsSavingTextbook(true);
      await api.upsertTextbook(chapterId, {
        title: textbookForm.title,
        fileUrl: textbookForm.fileUrl,
        fileSize: Number(textbookForm.fileSize),
        checksumSha256: textbookForm.checksumSha256,
        mimeType: textbookForm.mimeType,
        startPage: Number(textbookForm.startPage),
        endPage: Number(textbookForm.endPage),
        totalPages: Number(textbookForm.totalPages),
      });
      setActionMessage({
        type: 'success',
        text:
          lang === 'am'
            ? 'የመማሪያ መጽሐፍና የተቆረጠው ገጽ ክልል በተሳካ ሁኔታ ተቀምጧል!'
            : 'Textbook and page range saved successfully!',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'መጽሐፉን መመዝገብ አልተቻለም' : 'Failed to save textbook'),
      });
    } finally {
      setIsSavingTextbook(false);
    }
  };

  // Handle Create Quiz
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createQuiz(chapterId, {
        title: quizForm.title,
        amharicTitle: quizForm.amharicTitle || undefined,
        description: quizForm.description || undefined,
        passingScore: Number(quizForm.passingScore),
        isPractice: true,
      });
      setShowQuizModal(false);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'አዲስ የልምምድ ፈተና ተፈጥሯል!' : 'Practice quiz created successfully!',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ፈተና መፍጠር አልተቻለም' : 'Failed to create quiz'),
      });
    }
  };

  // Handle Add Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const quizId = chapter?.quizzes?.[0]?.id;
    if (!quizId) return;

    try {
      await api.addQuizQuestion(quizId, {
        prompt: questionForm.prompt,
        amharicPrompt: questionForm.amharicPrompt || questionForm.prompt,
        points: Number(questionForm.points),
        explanation: questionForm.explanation || undefined,
        choices: questionForm.choices.map((c, idx) => ({
          text: c.text,
          amharicText: c.amharicText || c.text,
          isCorrect: c.isCorrect,
          orderIndex: idx + 1,
        })),
      });
      setShowQuestionModal(false);
      setQuestionForm(initialQuestionState);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'ጥያቄ በተሳካ ሁኔታ ተጨምሯል!' : 'Question added successfully!',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ጥያቄ መጨመር አልተቻለም' : 'Failed to add question'),
      });
    }
  };

  // Handle Add Reference
  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addReference(chapterId, {
        title: referenceForm.title,
        amharicTitle: referenceForm.amharicTitle || undefined,
        url: referenceForm.url,
        isDownloadable: referenceForm.isDownloadable,
        downloadableDocUrl: referenceForm.isDownloadable ? referenceForm.downloadableDocUrl : undefined,
        downloadableDocSize: referenceForm.isDownloadable ? Number(referenceForm.downloadableDocSize) : undefined,
        downloadableDocChecksum: referenceForm.isDownloadable ? referenceForm.downloadableDocChecksum : undefined,
      });
      setShowReferenceModal(false);
      setReferenceForm({
        title: '',
        amharicTitle: '',
        url: '',
        isDownloadable: false,
        downloadableDocUrl: '',
        downloadableDocSize: 204800,
        downloadableDocChecksum: 'ref-doc-checksum',
      });
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'አጋዥ መረጃ በተሳካ ሁኔታ ተያይዟል!' : 'Reference added successfully!',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'አጋዥ መረጃ ማያያዝ አልተቻለም' : 'Failed to add reference'),
      });
    }
  };

  // Handle Delete Quiz
  const handleDeleteQuiz = async (quizId: string) => {
    const confirmMsg =
      lang === 'am'
        ? 'እርግጠኛ ነዎት ይህን ፈተና እና በውስጡ ያሉትን ጥያቄዎች በሙሉ መሰረዝ ይፈልጋሉ?'
        : 'Are you sure you want to delete this quiz and all its questions?';
    if (!confirm(confirmMsg)) return;
    try {
      await api.deleteQuiz(quizId);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'ፈተናው በተሳካ ሁኔታ ተሰርዟል!' : 'Quiz deleted successfully!',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ፈተናውን መሰረዝ አልተቻለም' : 'Failed to delete quiz'),
      });
    }
  };

  // Handle Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    const confirmMsg =
      lang === 'am' ? 'ይህን ጥያቄ መሰረዝ ይፈልጋሉ?' : 'Are you sure you want to delete this question?';
    if (!confirm(confirmMsg)) return;
    try {
      await api.deleteQuestion(questionId);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'ጥያቄው በተሳካ ሁኔታ ተሰርዟል!' : 'Question deleted successfully!',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ጥያቄውን መሰረዝ አልተቻለም' : 'Failed to delete question'),
      });
    }
  };

  // Handle Delete Reference
  const handleDeleteReference = async (referenceId: string) => {
    const confirmMsg =
      lang === 'am' ? 'ይህን አጋዥ መረጃ መሰረዝ ይፈልጋሉ?' : 'Are you sure you want to delete this reference?';
    if (!confirm(confirmMsg)) return;
    try {
      await api.deleteReference(referenceId);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'አጋዥ መረጃው በተሳካ ሁኔታ ተሰርዟል!' : 'Reference deleted successfully!',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ማጣቀሻውን መሰረዝ አልተቻለም' : 'Failed to delete reference'),
      });
    }
  };

  // Handle Publish Package
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const res = await api.publishChapter(chapterId);
      setActionMessage({
        type: 'success',
        text:
          lang === 'am'
            ? `ምዕራፉ በተሳካ ሁኔታ ታትሟል! ስሪት፡ v${res.version || res.manifest?.version || 1}። አሁን ተማሪዎች ከመስመር ውጭ ሊያወርዱት ይችላሉ።`
            : `Chapter published successfully! Version: v${res.version || res.manifest?.version || 1}. Students can now download it offline.`,
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ምዕራፉን ማተም አልተቻለም' : 'Failed to publish chapter'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Unpublish
  const handleUnpublish = async () => {
    try {
      setIsPublishing(true);
      await api.unpublishChapter(chapterId);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'ምዕራፉ ከህትመት እንዲወርድ ተደርጓል።' : 'Chapter has been unpublished.',
      });
      loadChapterData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ማውረድ አልተቻለም' : 'Failed to unpublish chapter'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <span>{lang === 'am' ? 'የምዕራፉን ይዘት በመጫን ላይ...' : 'Loading chapter content...'}</span>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="p-12 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">
          {lang === 'am' ? 'ምዕራፉ አልተገኘም' : 'Chapter not found'}
        </h2>
        <Link href="/admin/curriculum" className="text-amber-400 text-sm hover:underline mt-2 inline-block">
          {lang === 'am' ? 'ወደ ስርዓተ ትምህርት ተመለስ' : 'Back to Curriculum'}
        </Link>
      </div>
    );
  }

  const primaryQuiz = chapter.quizzes?.[0];

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Link
            href={`/admin/curriculum?grade=${chapter.subject?.gradeId}&subject=${chapter.subjectId}`}
            className="hover:text-amber-400 flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'am' ? 'ወደ ስርዓተ ትምህርት ተመለስ' : 'Back to Curriculum'}</span>
          </Link>
          <span>/</span>
          <span>{pick(chapter.subject?.grade?.amharicName, chapter.subject?.grade?.name)}</span>
          <span>/</span>
          <span>{pick(chapter.subject?.amharicName, chapter.subject?.name)}</span>
          <span>/</span>
          <span className="text-white font-medium">
            {lang === 'am' ? `ምዕራፍ ${chapter.chapterNumber}` : `Chapter ${chapter.chapterNumber}`}
          </span>
        </div>

        <Link
          href={`/admin/ai?gradeId=${chapter.subject?.gradeId}&subjectId=${chapter.subjectId}&chapterId=${chapter.id}`}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold border border-slate-700 transition shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'am' ? 'አይአይ ረዳት ስቱዲዮ' : 'AI Curriculum Studio'}</span>
        </Link>
      </div>

      {/* Chapter Title & Publication Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-semibold">
              {lang === 'am' ? `ምዕራፍ ${chapter.chapterNumber}` : `Chapter ${chapter.chapterNumber}`}
            </span>
            {chapter.isPublished ? (
              <span className="flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {lang === 'am' ? `የታተመ (v${chapter.version})` : `Published (v${chapter.version})`}
              </span>
            ) : (
              <span className="flex items-center text-xs font-semibold text-amber-400 bg-amber-950/80 border border-amber-800 px-2.5 py-0.5 rounded-full">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {lang === 'am' ? 'ረቂቅ' : 'Draft'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {pick(chapter.amharicTitle, chapter.title)}
            </h1>
            <button
              onClick={() => {
                setEditChapterForm({
                  chapterNumber: chapter.chapterNumber,
                  title: chapter.title || '',
                  amharicTitle: chapter.amharicTitle || '',
                  description: chapter.description || '',
                });
                setShowEditChapterModal(true);
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
              title={lang === 'am' ? 'ርዕስ አሻሽል' : 'Edit Title'}
            >
              <Edit3 className="w-3 h-3" />
              <span>{lang === 'am' ? 'አሻሽል' : 'Edit'}</span>
            </button>
          </div>
        </div>

        {/* Publication Actions */}
        <div className="flex items-center space-x-3">
          {chapter.isPublished ? (
            <button
              onClick={handleUnpublish}
              disabled={isPublishing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              {lang === 'am' ? 'አታሳትም' : 'Unpublish'}
            </button>
          ) : null}

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm shadow-lg transition"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck className="w-4 h-4" />
            )}
            <span>
              {chapter.isPublished
                ? (lang === 'am' ? 'እንደገና አትም' : 'Re-Publish')
                : (lang === 'am' ? 'ይዘቱን አትም' : 'Publish Package')}
            </span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
              : 'bg-red-950/80 border border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            {lang === 'am' ? 'ዝጋ' : 'Close'}
          </button>
        </div>
      )}

      {/* 3-Column Content Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. TEXTBOOK PDF & PAGE CLAMPING */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {lang === 'am' ? '፩. የመማሪያ መጽሐፍና ገጾች' : '1. Textbook PDF & Pages'}
            </h2>
          </div>

          {/* Subject Master Textbook Quick Connector */}
          {chapter.subject?.textbookUrl && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'am' ? 'የትምህርቱ ዋና መጽሐፍ' : 'Subject Master Textbook'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {chapter.subject.textbookTotalPages || 100} {lang === 'am' ? 'ጠቅላላ ገጾች' : 'pages'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate" title={chapter.subject.textbookFileName}>
                {chapter.subject.textbookFileName || 'Subject Master Textbook PDF'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setTextbookForm((prev) => ({
                    ...prev,
                    title: `${pick(chapter.subject?.amharicName, chapter.subject?.name)} - ${lang === 'am' ? 'ምዕራፍ' : 'Chapter'} ${chapter.chapterNumber}`,
                    fileUrl: chapter.subject.textbookUrl,
                    fileSize: chapter.subject.textbookFileSize || 5242880,
                    checksumSha256: chapter.subject.textbookChecksumSha256 || 'subject-master-sha256',
                    totalPages: chapter.subject.textbookTotalPages || 100,
                  }));
                  setUploadedPdfFileName(chapter.subject.textbookFileName || 'Subject Master Textbook');
                  setActionMessage({
                    type: 'success',
                    text:
                      lang === 'am'
                        ? 'የትምህርቱ ዋና መጽሐፍ ተመርጧል! አሁን መጀመሪያና መጨረሻ ገጾችን ይወስኑ።'
                        : 'Subject master textbook selected! Now set start and end pages.',
                  });
                }}
                className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition flex items-center justify-center space-x-1 shadow"
              >
                <span>{lang === 'am' ? 'ይህን ዋና መጽሐፍ ተጠቀም' : 'Use This Master Textbook'}</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSaveTextbook} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                {lang === 'am' ? 'የመጽሐፉ ርዕስ' : 'Textbook Title'}
              </label>
              <input
                type="text"
                required
                value={textbookForm.title}
                onChange={(e) => setTextbookForm({ ...textbookForm, title: e.target.value })}
                placeholder={lang === 'am' ? 'የ፮ኛ ክፍል ታሪከ ቤተ ክርስቲያን' : 'Grade 6 Church History'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Direct PDF File Upload Box */}
            <div className="space-y-2">
              <label className="block text-slate-400 font-semibold">
                {lang === 'am' ? 'የፒዲኤፍ ፋይል ስቀል' : 'Upload PDF File'}
              </label>
              <label className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-amber-500/80 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 bg-slate-950/60 hover:bg-slate-950 transition text-center group">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                  disabled={isUploadingPdf}
                />
                {isUploadingPdf ? (
                  <div className="flex items-center space-x-2 text-amber-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-semibold text-xs">
                      {lang === 'am' ? 'ፋይሉን በመጫን ላይ...' : 'Uploading file...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-amber-300 block">
                        {lang === 'am' ? 'PDF ፋይል እዚህ ይጫኑ' : 'Upload PDF File Here'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {lang === 'am'
                          ? 'ክሊክ በማድረግ ከኮምፒውተርዎ ይምረጡ (.pdf እስከ 100MB)'
                          : 'Click to select from your device (.pdf up to 100MB)'}
                      </span>
                    </div>
                  </>
                )}
              </label>

              {/* Uploaded File Confirmation Banner */}
              {textbookForm.fileUrl && (
                <div className="p-3 bg-slate-950 border border-emerald-800/60 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-400 font-semibold text-[11px]">
                    <span className="flex items-center space-x-1 truncate max-w-[200px]">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">
                        {uploadedPdfFileName || (lang === 'am' ? 'የተያያዘ PDF ፋይል' : 'Attached PDF File')}
                      </span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {(textbookForm.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                    <span className="text-slate-500 font-mono truncate max-w-[170px]" title={textbookForm.checksumSha256}>
                      SHA256: {textbookForm.checksumSha256.substring(0, 14)}...
                    </span>
                    <a
                      href={textbookForm.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center space-x-0.5 font-semibold"
                    >
                      <span>{lang === 'am' ? 'ፒዲኤፍ እይ' : 'View PDF'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Manual URL Input (Fallback / Custom Host) */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-[11px]">
                {lang === 'am' ? 'ወይም የፋይል ሊንክ' : 'Or File URL'}
              </label>
              <input
                type="url"
                required
                value={textbookForm.fileUrl}
                onChange={(e) => setTextbookForm({ ...textbookForm, fileUrl: e.target.value })}
                placeholder="https://res.cloudinary.com/.../history.pdf"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500 font-mono text-[11px]"
              />
            </div>

            {/* Clamped Page Ranges */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-amber-300 font-semibold">
                <span className="flex items-center">
                  <Sliders className="w-3.5 h-3.5 mr-1" />
                  {lang === 'am' ? 'የተቆረጠ የገጽ ክልል' : 'Clamped Pages Range'}
                </span>
                <span>{textbookForm.startPage} - {textbookForm.endPage}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-0.5 text-[11px]">
                    {lang === 'am' ? 'መጀመሪያ ገጽ' : 'Start Page'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={textbookForm.startPage}
                    onChange={(e) => setTextbookForm({ ...textbookForm, startPage: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 text-[11px]">
                    {lang === 'am' ? 'መጨረሻ ገጽ' : 'End Page'}
                  </label>
                  <input
                    type="number"
                    min={textbookForm.startPage}
                    required
                    value={textbookForm.endPage}
                    onChange={(e) => setTextbookForm({ ...textbookForm, endPage: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-0.5 text-[11px]">
                  {lang === 'am' ? 'ጠቅላላ የመጽሐፉ ገጾች' : 'Total Book Pages'}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={textbookForm.totalPages}
                  onChange={(e) => setTextbookForm({ ...textbookForm, totalPages: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingTextbook}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center justify-center space-x-1 shadow"
            >
              {isSavingTextbook ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              <span>{lang === 'am' ? 'የመጽሐፍ ገጾችን አስቀምጥ' : 'Save Textbook'}</span>
            </button>
          </form>

          {/* Chapter Extraction Preview & Diagnostics */}
          {chapter.textbook && (
            <div className="p-3 bg-slate-950/80 rounded-lg border border-amber-500/20 space-y-2 mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{lang === 'am' ? 'የምዕራፍ የተቆረጠ ፒዲኤፍ' : 'Isolated Chapter PDF'}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px]">
                  {Math.max(1, (chapter.textbook.endPage || textbookForm.endPage) - (chapter.textbook.startPage || textbookForm.startPage) + 1)} {lang === 'am' ? 'ገጾች' : 'pages'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {lang === 'am'
                  ? `ዋና መጽሐፍ ገጽ ${chapter.textbook.startPage || textbookForm.startPage} - ${chapter.textbook.endPage || textbookForm.endPage} ተቆርጦ ለተማሪው ከገጽ ፩ እስከ ${Math.max(1, (chapter.textbook.endPage || textbookForm.endPage) - (chapter.textbook.startPage || textbookForm.startPage) + 1)} ብቻ ይታያል።`
                  : `Pages ${chapter.textbook.startPage || textbookForm.startPage} - ${chapter.textbook.endPage || textbookForm.endPage} from master book are isolated into a standalone document (Pages 1 - ${Math.max(1, (chapter.textbook.endPage || textbookForm.endPage) - (chapter.textbook.startPage || textbookForm.startPage) + 1)}).`}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`/api/chapters/${chapterId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-center text-[11px] font-semibold transition flex items-center justify-center space-x-1 border border-slate-700"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>{lang === 'am' ? 'የተቆረጠ PDF እይ' : 'Inspect PDF'}</span>
                </a>
                <a
                  href={`/chapters/${chapterId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-center text-[11px] font-semibold transition flex items-center justify-center space-x-1 border border-amber-500/30"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{lang === 'am' ? 'የተማሪ ገጽ ፈትሽ' : 'Student View'}</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 2. PRACTICE QUIZ & QUESTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {lang === 'am' ? '፪. የልምምድ ፈተና' : '2. Practice Quiz'}
              </h2>
            </div>
            {primaryQuiz && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowQuestionModal(true)}
                  className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-0.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                >
                  <PlusCircle className="w-3 h-3 mr-0.5" />
                  <span>{lang === 'am' ? 'ጥያቄ ጨምር' : 'Add Question'}</span>
                </button>
                <button
                  onClick={() => handleDeleteQuiz(primaryQuiz.id)}
                  className="text-slate-500 hover:text-red-400 p-0.5 transition"
                  title={lang === 'am' ? 'ፈተናውን ሰርዝ' : 'Delete Quiz'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {!primaryQuiz ? (
            <div className="p-6 text-center text-slate-400 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
              <p className="text-xs">
                {lang === 'am' ? 'ለዚህ ምዕራፍ ምንም ፈተና አልተዘጋጀም።' : 'No quiz prepared for this chapter.'}
              </p>
              <button
                onClick={() => setShowQuizModal(true)}
                className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition"
              >
                {lang === 'am' ? 'አዲስ ፈተና ፍጠር' : 'Create Quiz'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">
                    {pick(primaryQuiz.amharicTitle, primaryQuiz.title)}
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {lang === 'am' ? 'ማለፊያ:' : 'Passing:'} {primaryQuiz.passingScore}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'am' ? 'ጠቅላላ ጥያቄዎች፡' : 'Total Questions:'} {(primaryQuiz.questions || []).length}
                </p>
              </div>

              {/* Questions List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(primaryQuiz.questions || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">
                    {lang === 'am' ? 'ምንም ጥያቄ አልተጨመረም። "ጥያቄ ጨምር" የሚለውን ይጫኑ።' : 'No questions added yet. Click "Add Question".'}
                  </p>
                ) : (
                  (primaryQuiz.questions || []).map((q: any, idx: number) => (
                    <div key={q.id} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
                      <div className="flex justify-between items-start text-xs text-slate-300 font-medium">
                        <span className="flex-1 pr-2">
                          {idx + 1}. {pick(q.amharicPrompt, q.prompt)}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-amber-400 font-mono text-[11px]">
                            {q.points} {lang === 'am' ? 'ነጥብ' : 'pts'}
                          </span>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-slate-500 hover:text-red-400 p-0.5 transition"
                            title={lang === 'am' ? 'ጥያቄውን ሰርዝ' : 'Delete Question'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-0.5 pl-3 pt-1">
                        {q.choices?.map((c: any) => (
                          <div
                            key={c.id}
                            className={`text-[11px] flex items-center space-x-1.5 ${
                              c.isCorrect ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            <span>{c.isCorrect ? '✓' : '•'}</span>
                            <span>{pick(c.amharicText, c.text)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. APPROVED REFERENCES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Link2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {lang === 'am' ? '፫. አጋዥ መረጃዎች' : '3. References'}
              </h2>
            </div>
            <button
              onClick={() => setShowReferenceModal(true)}
              className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-0.5"
            >
              <PlusCircle className="w-3 h-3" />
              <span>{lang === 'am' ? 'መረጃ አያይዝ' : 'Add Reference'}</span>
            </button>
          </div>

          {(chapter.references || []).length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-950 rounded-lg border border-slate-800">
              {lang === 'am' ? 'ምንም አጋዥ ማጣቀሻ አልተያያዘም።' : 'No references attached.'}
            </div>
          ) : (
            <div className="space-y-2">
              {chapter.references.map((ref: any) => (
                <div key={ref.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-semibold text-slate-200">
                      {pick(ref.amharicTitle, ref.title)}
                    </h4>
                    <div className="flex items-center space-x-1.5">
                      {ref.isDownloadable ? (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded">
                          Offline PDF
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-950 border border-blue-800 px-1.5 py-0.5 rounded">
                          Online Link
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteReference(ref.id)}
                        className="text-slate-500 hover:text-red-400 p-0.5 transition"
                        title={lang === 'am' ? 'ማጣቀሻውን ሰርዝ' : 'Delete Reference'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-amber-400 hover:underline truncate block"
                  >
                    {ref.url}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE QUIZ MODAL */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <span>{lang === 'am' ? 'የልምምድ ፈተና አዘጋጅ' : 'Create Practice Quiz'}</span>
            </h2>
            <form onSubmit={handleCreateQuiz} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'am' ? 'የፈተናው ርዕስ' : 'Quiz Title'}
                </label>
                <input
                  type="text"
                  required
                  value={quizForm.amharicTitle}
                  onChange={(e) => setQuizForm({ ...quizForm, amharicTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'am' ? 'ማለፊያ ውጤት (%)' : 'Passing Score (%)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={quizForm.passingScore}
                  onChange={(e) => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 font-bold text-slate-950 rounded hover:bg-amber-400"
                >
                  {lang === 'am' ? 'ፍጠር' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <span>{lang === 'am' ? 'አዲስ ጥያቄ ጨምር' : 'Add Practice Question'}</span>
            </h2>

            <form onSubmit={handleAddQuestion} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'am' ? 'የጥያቄው ጽሑፍ' : 'Question Prompt'}
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder={
                    lang === 'am'
                      ? 'ለምሳሌ፡ ሐዋርያት መንፈስ ቅዱስ የወረደባቸው የት ነበር?'
                      : 'e.g. Where did the Holy Spirit descend upon the Apostles?'
                  }
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'am' ? 'ማብራሪያ (ለትክክለኛው መልስ)' : 'Explanation (for correct answer)'}
                </label>
                <input
                  type="text"
                  placeholder={
                    lang === 'am'
                      ? 'ሐዋርያት በኢየሩሳሌም በጽርሐ ጽዮን በአንድ ልብ ሆነው ሳሉ...'
                      : 'When the Apostles were assembled with one accord in Jerusalem...'
                  }
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              {/* Choices */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-400 font-semibold">
                    {lang === 'am' ? 'የምርጫ መልሶች (ትክክለኛውን ይምረጡ)' : 'Choices (Select the correct answer)'}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddChoice}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'am' ? 'አማራጭ ጨምር' : 'Add Option'}</span>
                  </button>
                </div>

                {questionForm.choices.length < 4 && (
                  <p className="text-[11px] text-amber-400">
                    {lang === 'am' ? '⚠️ ቢያንስ 4 አማራጮች ይመከራሉ' : '⚠️ At least 4 options recommended'}
                  </p>
                )}

                {questionForm.choices.map((choice, cIdx) => (
                  <div key={cIdx} className="flex items-center space-x-2">
                    <span className="w-5 text-center text-xs font-bold text-slate-500">
                      {String.fromCharCode(65 + cIdx)}.
                    </span>
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={choice.isCorrect}
                      onChange={() => {
                        const updated = questionForm.choices.map((c, i) => ({
                          ...c,
                          isCorrect: i === cIdx,
                        }));
                        setQuestionForm({ ...questionForm, choices: updated });
                      }}
                      className="text-amber-500 focus:ring-amber-400"
                      title={lang === 'am' ? 'እንደ ትክክለኛ መልስ ምረጥ' : 'Mark as correct answer'}
                    />
                    <input
                      type="text"
                      required
                      placeholder={lang === 'am' ? `ምርጫ ${cIdx + 1}` : `Choice ${cIdx + 1}`}
                      value={choice.text}
                      onChange={(e) => {
                        const updated = [...questionForm.choices];
                        const target = updated[cIdx];
                        if (target) {
                          target.text = e.target.value;
                          setQuestionForm({ ...questionForm, choices: updated });
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white"
                    />
                    {questionForm.choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChoice(cIdx)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title={lang === 'am' ? 'አማራጩን አስወግድ' : 'Remove choice'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 font-bold text-slate-950 rounded hover:bg-amber-400"
                >
                  {lang === 'am' ? 'ጥያቄውን መዝግብ' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD REFERENCE MODAL */}
      {showReferenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Link2 className="w-5 h-5 text-amber-400" />
              <span>{lang === 'am' ? 'አጋዥ መረጃ አያይዝ' : 'Add Reference'}</span>
            </h2>
            <form onSubmit={handleAddReference} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'am' ? 'የርዕስ ስም' : 'Reference Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'am' ? 'የሐዋርያት ታሪክ ዝርዝር ማስታወሻ' : 'Acts of Apostles Notes'}
                  value={referenceForm.title}
                  onChange={(e) => setReferenceForm({ ...referenceForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'am' ? 'የድረ-ገጽ አድራሻ (URL)' : 'Web URL'}
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://eotc-andnet.org/..."
                  value={referenceForm.url}
                  onChange={(e) => setReferenceForm({ ...referenceForm, url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isDownloadable"
                  checked={referenceForm.isDownloadable}
                  onChange={(e) => setReferenceForm({ ...referenceForm, isDownloadable: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="isDownloadable" className="text-slate-300 font-semibold cursor-pointer">
                  {lang === 'am' ? 'ከመስመር ውጭ ይወረዳል (PDF, DOC, PPT)' : 'Available for Offline (PDF, DOC, PPT)'}
                </label>
              </div>

              {referenceForm.isDownloadable && (
                <div className="space-y-2 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="space-y-1">
                    <label className="block text-slate-400 font-semibold text-[11px]">
                      {lang === 'am' ? 'ሰነድ ስቀል (.pdf, .doc, .ppt)' : 'Upload Document (.pdf, .doc, .ppt)'}
                    </label>
                    <label className="cursor-pointer border border-dashed border-slate-700 hover:border-amber-500 rounded-lg p-2.5 flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-850 transition">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        onChange={handleReferenceDocUpload}
                        className="hidden"
                        disabled={isUploadingRefDoc}
                      />
                      {isUploadingRefDoc ? (
                        <div className="flex items-center space-x-1.5 text-amber-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{lang === 'am' ? 'በመጫን ላይ...' : 'Uploading...'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-amber-300 font-semibold">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{lang === 'am' ? 'ከኮምፒውተር ሰነድ ይምረጡ' : 'Select Document from Device'}</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-0.5 text-[11px]">
                      {lang === 'am' ? 'የፋይል ሊንክ (Doc URL)' : 'Doc URL'}
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://...file.pdf"
                      value={referenceForm.downloadableDocUrl}
                      onChange={(e) => setReferenceForm({ ...referenceForm, downloadableDocUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReferenceModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 font-bold text-slate-950 rounded hover:bg-amber-400"
                >
                  {lang === 'am' ? 'አያይዝ' : 'Attach Reference'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CHAPTER DETAILS MODAL */}
      {showEditChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              <span>{lang === 'am' ? 'የምዕራፍ መረጃ አሻሽል' : 'Edit Chapter Details'}</span>
            </h2>
            <form onSubmit={handleUpdateChapterDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'am' ? 'የምዕራፍ ቁጥር' : 'Chapter Number'}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editChapterForm.chapterNumber}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, chapterNumber: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'am' ? 'ርዕስ በእንግሊዝኛ' : 'Title (English)'}
                </label>
                <input
                  type="text"
                  required
                  value={editChapterForm.title}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'am' ? 'ርዕስ በአማርኛ' : 'Title (Amharic)'}
                </label>
                <input
                  type="text"
                  value={editChapterForm.amharicTitle}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, amharicTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditChapterModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm"
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
