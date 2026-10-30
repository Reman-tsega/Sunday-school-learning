'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  ExternalLink,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Church,
  User,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { QuestionTypeFilter, type QuestionTypeFilterValue } from '@/components/QuestionTypeFilter';
import type { ModeratedReferenceDto, PracticeQuestionDto } from '@eotc/shared';

/** Grade › Subject › Chapter trail so the admin knows exactly where a submission belongs. */
function ContextTrail({ item, lang }: { item: any; lang: 'am' | 'en' }) {
  const parts: string[] = [];
  if (item.gradeLevel != null) parts.push(lang === 'am' ? `ክፍል ${item.gradeLevel}` : `Grade ${item.gradeLevel}`);
  const subject = lang === 'am' ? item.amharicSubjectName || item.subjectName : item.subjectName;
  if (subject) parts.push(subject);
  const chapter = lang === 'am'
    ? item.chapter?.amharicTitle || item.chapter?.title
    : item.chapter?.title || item.chapter?.amharicTitle;
  parts.push(chapter || (lang === 'am' ? 'ምዕራፍ' : 'Chapter'));
  return (
    <span className="text-xs font-bold text-stone-800 dark:text-slate-300">
      {parts.join(' › ')}
    </span>
  );
}

export default function AdminModerationPage() {
  const { lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'references'>('questions');

  const [pendingReferences, setPendingReferences] = useState<ModeratedReferenceDto[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<PracticeQuestionDto[]>([]);
  const [typeFilter, setTypeFilter] = useState<QuestionTypeFilterValue>('ALL');
  const visibleQuestions =
    typeFilter === 'ALL' ? pendingQuestions : pendingQuestions.filter((q) => q.questionType === typeFilter);

  // Decline Dialog Modal State
  const [declineModal, setDeclineModal] = useState<{
    isOpen: boolean;
    type: 'question' | 'reference';
    itemId: string;
    itemTitle: string;
    reason: string;
  }>({
    isOpen: false,
    type: 'question',
    itemId: '',
    itemTitle: '',
    reason: '',
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    // Deep link from notifications: /admin/moderation?tab=references|questions
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'references' || tab === 'questions') setActiveTab(tab);
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      await api.init();
      const data = await api.getPendingModeration();
      setPendingReferences(data.references || []);
      setPendingQuestions(data.practiceQuestions || []);
    } catch (err: any) {
      console.error('Failed to load pending moderation items:', err);
      setNotification({
        type: 'error',
        text: err.message || 'Failed to load pending moderation',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (type: 'question' | 'reference', id: string) => {
    setActionLoading(true);
    setNotification(null);
    try {
      if (type === 'question') {
        await api.reviewModerationPracticeQuestion(id, 'APPROVE');
        setPendingQuestions((prev) => prev.filter((q) => q.id !== id));
      } else {
        await api.reviewModerationReference(id, 'APPROVE');
        setPendingReferences((prev) => prev.filter((r) => r.id !== id));
      }
      setNotification({
        type: 'success',
        text:
          lang === 'am'
            ? 'ይዘቱ በተሳካ ሁኔታ ጸድቋል! አሁን ለተማሪዎች ይታያል።'
            : 'Item approved successfully and published to students.',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to approve item',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeclineModal = (type: 'question' | 'reference', item: any) => {
    const title =
      type === 'question'
        ? item.prompt || 'Practice Question'
        : item.amharicTitle || item.title || 'Reference Link';
    setDeclineModal({
      isOpen: true,
      type,
      itemId: item.id,
      itemTitle: title,
      reason: '',
    });
  };

  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModal.reason.trim()) {
      alert(lang === 'am' ? 'እባክዎ የተመለሰበትን ምክንያት ያስገቡ' : 'Please provide a feedback reason');
      return;
    }

    setActionLoading(true);
    setNotification(null);
    try {
      if (declineModal.type === 'question') {
        await api.reviewModerationPracticeQuestion(
          declineModal.itemId,
          'DECLINE',
          declineModal.reason.trim()
        );
        setPendingQuestions((prev) => prev.filter((q) => q.id !== declineModal.itemId));
      } else {
        await api.reviewModerationReference(
          declineModal.itemId,
          'DECLINE',
          declineModal.reason.trim()
        );
        setPendingReferences((prev) => prev.filter((r) => r.id !== declineModal.itemId));
      }

      setNotification({
        type: 'success',
        text:
          lang === 'am'
            ? 'ይዘቱ ውድቅ ተደርጓል፣ ምክንያቱም ለአስተማሪው ተልኳል።'
            : 'Item declined and feedback sent to the contributing teacher.',
      });
      setDeclineModal({ isOpen: false, type: 'question', itemId: '', itemTitle: '', reason: '' });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to decline item',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 text-stone-900 dark:text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/30 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-amber-600 dark:text-amber-400" />
              <span>✟ {lang === 'am' ? 'የይዘት ማጣሪያና ማፅደቂያ' : 'Doctrinal Moderation Desk'}</span>
            </span>
            <span className="text-xs text-stone-500 dark:text-slate-400 font-medium">
              {pendingQuestions.length + pendingReferences.length}{' '}
              {lang === 'am' ? 'በግምገማ ላይ ያሉ' : 'pending items'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 dark:text-white">
            {lang === 'am' ? 'የመምህራን ይዘት ግምገማ' : 'Teacher Content Moderation'}
          </h1>
          <p className="text-stone-500 dark:text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
            {lang === 'am'
              ? 'በመምህራን የቀረቡትን ማጣቀሻዎች እና የልምምድ ጥያቄዎች ኦርቶዶክሳዊ ትምህርትን መሠረት ያደረጉ መሆናቸውን አረጋግጠው ያጽድቁ ወይም በምክንያት ይመልሱ።'
              : 'Review submitted supplementary reference links and self-study practice questions to uphold theological and educational excellence.'}
          </p>
        </div>

        <button
          onClick={loadPending}
          disabled={loading}
          className="p-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-400 border border-stone-300 dark:border-slate-700 transition flex items-center justify-center shrink-0 self-start sm:self-auto cursor-pointer"
          title={lang === 'am' ? 'ዳግም ጫን' : 'Refresh'}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start space-x-3 text-xs sm:text-sm font-bold animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/40'
              : 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-500/40'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-900/60 p-1.5 rounded-2xl gap-2">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>{lang === 'am' ? 'የልምምድ ጥያቄዎች' : 'Practice Questions'}</span>
          {pendingQuestions.length > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'questions'
                  ? 'bg-slate-950 text-amber-300'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}
            >
              {pendingQuestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('references')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer ${
            activeTab === 'references'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{lang === 'am' ? 'ማጣቀሻ ሰነዶች' : 'Supplementary References'}</span>
          {pendingReferences.length > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'references'
                  ? 'bg-slate-950 text-amber-300'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}
            >
              {pendingReferences.length}
            </span>
          )}
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-16 text-center text-stone-500 dark:text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400 mx-auto" />
          <p className="text-xs font-semibold">
            {lang === 'am' ? 'በግምገማ ላይ ያሉትን በማዘጋጀት ላይ...' : 'Loading pending contributions...'}
          </p>
        </div>
      )}

      {/* TAB 1: PRACTICE QUESTIONS */}
      {!loading && activeTab === 'questions' && (
        <div className="space-y-4">
          {pendingQuestions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-12 text-center text-stone-500 dark:text-slate-400 space-y-2 shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400/60 mx-auto" />
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                {lang === 'am' ? 'በግምገማ ላይ ያለ ምንም የልምምድ ጥያቄ የለም!' : 'All Practice Questions Moderated!'}
              </h3>
              <p className="text-xs text-stone-400 dark:text-slate-500">
                {lang === 'am'
                  ? 'መምህራን አዳዲስ ጥያቄዎችን ሲያቀርቡ እዚህ ይዘረዘራሉ።'
                  : 'Newly submitted teacher practice questions will appear here for verification.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <QuestionTypeFilter questions={pendingQuestions} value={typeFilter} onChange={setTypeFilter} lang={lang} />
              {visibleQuestions.length === 0 && (
                <p className="text-xs text-stone-500 dark:text-slate-400 py-6 text-center">
                  {lang === 'am' ? 'በዚህ አይነት ምንም ጥያቄ የለም' : 'No pending questions of this type.'}
                </p>
              )}
              {visibleQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 hover:border-stone-300 dark:hover:border-slate-700 transition"
                >
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-600/40">
                        {q.questionType}
                      </span>
                      <ContextTrail item={q} lang={lang} />
                    </div>

                    {/* Submitter & Parish */}
                    <div className="flex items-center space-x-3 text-xs text-stone-500 dark:text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500" />
                        <span className="font-semibold text-stone-800 dark:text-slate-300">
                          {q.createdBy?.fullName || 'Teacher'}
                        </span>
                      </div>
                      {q.createdBy?.churchParish && (
                        <div className="flex items-center space-x-1 text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40 font-semibold text-[11px]">
                          <Church className="w-3 h-3" />
                          <span>{q.createdBy.churchParish}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                      {q.prompt}
                    </h3>

                    {/* Choices display */}
                    {q.choices && q.choices.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.choices.map((c) => (
                          <div
                            key={c.id || c.orderIndex}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              c.isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-200'
                                : 'bg-stone-50 dark:bg-slate-800/40 border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-medium">
                              {c.text}
                            </span>
                            {c.isCorrect && (
                              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded ml-2">
                                {lang === 'am' ? 'ትክክለኛ መልስ' : 'Correct'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Short Answer display */}
                    {q.questionType === 'SHORT_ANSWER' && q.answerText && (
                      <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded-xl border border-stone-200 dark:border-slate-700/60 text-xs text-stone-800 dark:text-slate-200">
                        <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">
                          {lang === 'am' ? 'የሚጠበቀው መልስ:' : 'Expected Answer:'}
                        </span>
                        <span>{q.answerText}</span>
                      </div>
                    )}

                    {/* Spiritual Explanation display */}
                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-xs text-amber-900 dark:text-amber-200/90 space-y-0.5">
                        <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center space-x-1 text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>{lang === 'am' ? 'የመንፈሳዊ ማብራሪያ' : 'Spiritual Explanation'}</span>
                        </span>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                    <button
                      onClick={() => handleOpenDeclineModal('question', q)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 dark:text-rose-300 dark:border-rose-500/40 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>{lang === 'am' ? 'አትቀበል (Decline)' : 'Decline with Reason'}</span>
                    </button>

                    <button
                      onClick={() => handleApprove('question', q.id)}
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'am' ? 'አጽድቅ (Approve)' : 'Approve Question'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPLEMENTARY REFERENCES */}
      {!loading && activeTab === 'references' && (
        <div className="space-y-4">
          {pendingReferences.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-12 text-center text-stone-500 dark:text-slate-400 space-y-2 shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400/60 mx-auto" />
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                {lang === 'am' ? 'በግምገማ ላይ ያለ ምንም ማጣቀሻ የለም!' : 'All References Moderated!'}
              </h3>
              <p className="text-xs text-stone-400 dark:text-slate-500">
                {lang === 'am'
                  ? 'መምህራን አዳዲስ የማጣቀሻ ሰነዶችን ሲያቀርቡ እዚህ ይዘረዘራሉ።'
                  : 'Newly submitted teacher reading materials will appear here for review.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReferences.map((r) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 hover:border-stone-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-600/40">
                        {r.isDownloadable ? 'Offline Doc' : 'External Link'}
                      </span>
                      <ContextTrail item={r} lang={lang} />
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-stone-500 dark:text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500" />
                        <span className="font-semibold text-stone-800 dark:text-slate-300">
                          {r.createdBy?.fullName || 'Teacher'}
                        </span>
                      </div>
                      {r.createdBy?.churchParish && (
                        <div className="flex items-center space-x-1 text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40 font-semibold text-[11px]">
                          <Church className="w-3 h-3" />
                          <span>{r.createdBy.churchParish}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                      {r.title}
                    </h3>
                    <a
                      href={r.downloadableDocUrl || r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1 max-w-xl truncate"
                    >
                      <span className="truncate">
                        {r.downloadableDocUrl
                          ? (lang === 'am' ? 'የተጫነ ሰነድ ክፈት' : 'Open uploaded document')
                          : r.url}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    {r.isDownloadable && (
                      <p className="text-[11px] text-stone-500 dark:text-slate-400">
                        {lang === 'am' ? 'ከመስመር ውጭ ማውረድ የሚቻል ሰነድ' : 'Offline Downloadable Document'}
                        {r.downloadableDocSize ? ` (${Math.round(r.downloadableDocSize / 1024)} KB)` : ''}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                    <button
                      onClick={() => handleOpenDeclineModal('reference', r)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 dark:text-rose-300 dark:border-rose-500/40 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>{lang === 'am' ? 'አትቀበል (Decline)' : 'Decline with Reason'}</span>
                    </button>

                    <button
                      onClick={() => handleApprove('reference', r.id)}
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'am' ? 'አጽድቅ (Approve)' : 'Approve Reference'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DECLINE FEEDBACK MODAL */}
      {declineModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDecline}
            className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-stone-900 dark:text-white"
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                <XCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-base">
                  {lang === 'am' ? 'ይዘቱን በምክንያት ይመልሱ' : 'Decline Contribution'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDeclineModal({ isOpen: false, type: 'question', itemId: '', itemTitle: '', reason: '' })
                }
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-slate-300">
              {lang === 'am'
                ? `«${declineModal.itemTitle}» ለምን እንዳልተፈቀደ ለአስተማሪው የሚላክ ግብረ-መልስ ያስገቡ።`
                : `Specify why "${declineModal.itemTitle}" was declined so the teacher can adjust and re-submit.`}
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'የመመለሻ ምክንያት / ግብረ-መልስ *' : 'Reason for Declining *'}
              </label>
              <textarea
                required
                rows={3}
                placeholder={
                  lang === 'am'
                    ? 'ምሳሌ፡ ጥያቄው በምዕራፉ ካለው የትምህርት ይዘት ጋር አይጣጣምም...'
                    : 'e.g. Please clarify choice wording or cite the chapter page accurately...'
                }
                value={declineModal.reason}
                onChange={(e) =>
                  setDeclineModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDeclineModal({ isOpen: false, type: 'question', itemId: '', itemTitle: '', reason: '' })
                }
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {lang === 'am' ? 'ይቅር' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={actionLoading || !declineModal.reason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {actionLoading
                  ? lang === 'am'
                    ? 'በመመለስ ላይ...'
                    : 'Submitting...'
                  : lang === 'am'
                  ? 'ምክንያቱን ልከህ መልስ'
                  : 'Confirm Decline'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
