'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Send,
  Trash2,
  Loader2,
  Megaphone,
  GraduationCap,
  Users,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

interface AvailableGrade {
  id: string;
  level: number;
  name: string;
  amharicName?: string;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { lang, pick } = useLanguage();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [grades, setGrades] = useState<AvailableGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [amharicTitle, setAmharicTitle] = useState('');
  const [content, setContent] = useState('');
  const [amharicContent, setAmharicContent] = useState('');
  const [targetType, setTargetType] = useState<'BROADCAST' | 'BY_GRADE' | 'BY_ROLE'>('BROADCAST');
  const [targetGradeId, setTargetGradeId] = useState('');
  const [targetRole, setTargetRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');

  const loadData = async () => {
    setLoading(true);
    try {
      await api.init();
      const user = api.getUser();
      if (!user || user.role !== 'ADMIN') {
        router.replace('/login');
        return;
      }

      const [notifs, curriculumData] = await Promise.all([
        api.listAdminNotifications(),
        api.getCurriculum(),
      ]);

      setNotifications(notifs || []);
      if (Array.isArray(curriculumData)) {
        const sortedGrades = curriculumData
          .map((g) => ({ id: g.id, level: g.level, name: g.name, amharicName: g.amharicName }))
          .sort((a, b) => a.level - b.level);
        setGrades(sortedGrades);
        const firstGrade = sortedGrades[0];
        if (firstGrade) {
          setTargetGradeId(firstGrade.id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load admin notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setStatusMessage({
        type: 'error',
        text: lang === 'am' ? 'እባክዎ ርዕስ እና መልእክት ያስገቡ' : 'Please provide a title and content',
      });
      return;
    }

    if (targetType === 'BY_GRADE' && !targetGradeId) {
      setStatusMessage({
        type: 'error',
        text: lang === 'am' ? 'እባክዎ ኢላማ ክፍል ይምረጡ' : 'Please select a target grade',
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      await api.createNotification({
        title: title.trim(),
        amharicTitle: amharicTitle.trim() || undefined,
        content: content.trim(),
        amharicContent: amharicContent.trim() || undefined,
        targetType,
        targetGradeId: targetType === 'BY_GRADE' ? targetGradeId : undefined,
        targetRole: targetType === 'BY_ROLE' ? targetRole : undefined,
      });

      setStatusMessage({
        type: 'success',
        text: lang === 'am' ? 'ማስታወቂያው በተሳካ ሁኔታ ተልኳል!' : 'Announcement dispatched successfully!',
      });

      // Clear Form
      setTitle('');
      setAmharicTitle('');
      setContent('');
      setAmharicContent('');
      setTargetType('BROADCAST');

      // Refresh list
      const updated = await api.listAdminNotifications();
      setNotifications(updated || []);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ማስታወቂያውን መላክ አልተቻለም' : 'Failed to dispatch notification'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'am' ? 'ይህ ማስታወቂያ ይሰረዝ?' : 'Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await api.deleteAdminNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setStatusMessage({
        type: 'success',
        text: lang === 'am' ? 'ማስታወቂያው ተሰርዟል' : 'Announcement deleted successfully',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'መሰረዝ አልተቻለም' : 'Failed to delete'),
      });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-amber-700 mb-1">
              <Link href="/admin" className="hover:underline flex items-center space-x-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'am' ? 'ወደ አስተዳዳሪ ስቱዲዮ' : 'Admin Studio'}</span>
              </Link>
              <span>/</span>
              <span>{lang === 'am' ? 'ማስታወቂያዎች' : 'Notifications & Announcements'}</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center space-x-2">
              <Bell className="w-6 h-6 text-amber-600" />
              <span>{lang === 'am' ? 'የማስታወቂያ መላኪያ እና መከታተያ' : 'Broadcast & Notifications Center'}</span>
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              {lang === 'am'
                ? 'ለተማሪዎች እና መምህራን ማስታወቂያዎችን በጠቅላላ ወይም በክፍል ለይተው ይላኩ'
                : 'Send targeted broadcasts to all students, specific grades, or teacher roles'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/admin/curriculum"
              className="px-3.5 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition flex items-center space-x-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>{lang === 'am' ? 'ሥርዓተ ትምህርት' : 'Curriculum Studio'}</span>
            </Link>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Compose Form (Left 5 Cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-stone-200 h-fit">
            <h2 className="text-base font-bold text-stone-900 mb-4 flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <span>{lang === 'am' ? 'አዲስ ማስታወቂያ ላክ' : 'Compose Announcement'}</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Type Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {lang === 'am' ? 'የመልእክቱ ተቀባይ (Target Audience) *' : 'Target Audience *'}
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-bold text-center">
                  <button
                    type="button"
                    onClick={() => setTargetType('BROADCAST')}
                    className={`py-2 rounded-lg transition ${
                      targetType === 'BROADCAST'
                        ? 'bg-white text-purple-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {lang === 'am' ? 'ለሁሉም' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('BY_GRADE')}
                    className={`py-2 rounded-lg transition ${
                      targetType === 'BY_GRADE'
                        ? 'bg-white text-blue-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {lang === 'am' ? 'በክፍል' : 'By Grade'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('BY_ROLE')}
                    className={`py-2 rounded-lg transition ${
                      targetType === 'BY_ROLE'
                        ? 'bg-white text-amber-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {lang === 'am' ? 'በሚና' : 'By Role'}
                  </button>
                </div>
              </div>

              {/* Conditional Grade Picker */}
              {targetType === 'BY_GRADE' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                  <label className="block text-xs font-bold text-blue-900">
                    {lang === 'am' ? 'የሚላክበት ክፍል ይምረጡ *' : 'Select Target Grade *'}
                  </label>
                  <select
                    value={targetGradeId}
                    onChange={(e) => setTargetGradeId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {pick(g.name, g.amharicName)} (Grade {g.level})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional Role Picker */}
              {targetType === 'BY_ROLE' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                  <label className="block text-xs font-bold text-amber-900">
                    {lang === 'am' ? 'የሚላክበት ሚና ይምረጡ *' : 'Select Target Role *'}
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="STUDENT">{lang === 'am' ? 'ተማሪዎች ብቻ (All Students)' : 'All Students'}</option>
                    <option value="TEACHER">{lang === 'am' ? 'መምህራን ብቻ (All Teachers)' : 'All Teachers'}</option>
                  </select>
                </div>
              )}

              {/* Title Inputs */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {lang === 'am' ? 'ርዕስ (እንግሊዝኛ) *' : 'Title (English) *'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Quiz Schedule Announced"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {lang === 'am' ? 'ርዕስ (በአማርኛ)' : 'Title (Amharic)'}
                </label>
                <input
                  type="text"
                  value={amharicTitle}
                  onChange={(e) => setAmharicTitle(e.target.value)}
                  placeholder="ምሳሌ፡ የፈተና መርሐግብር ማስታወቂያ"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Content Inputs */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {lang === 'am' ? 'የመልእክቱ ዝርዝር (እንግሊዝኛ) *' : 'Content (English) *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the full announcement details here..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {lang === 'am' ? 'የመልእክቱ ዝርዝር (በአማርኛ)' : 'Content (Amharic)'}
                </label>
                <textarea
                  rows={3}
                  value={amharicContent}
                  onChange={(e) => setAmharicContent(e.target.value)}
                  placeholder="የማስታወቂያውን ሙሉ ዝርዝር እዚህ ያስገቡ..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'am' ? 'በመላክ ላይ...' : 'Dispatching...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{lang === 'am' ? 'ማስታወቂያውን ላክ' : 'Send Announcement'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sent Notifications History (Right 7 Cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <Bell className="w-5 h-5 text-amber-600" />
                <span>{lang === 'am' ? 'የተላኩ ማስታወቂያዎች' : 'Dispatched Announcements'}</span>
              </h2>
              <span className="text-xs text-stone-400 font-semibold">
                {notifications.length} {lang === 'am' ? 'ማስታወቂያዎች' : 'items'}
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                <span className="text-xs">{lang === 'am' ? 'በመጫን ላይ...' : 'Loading announcements...'}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center text-stone-400 space-y-2">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                  <Megaphone className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-stone-600">
                  {lang === 'am' ? 'ምንም የተላከ ማስታወቂያ የለም' : 'No announcements dispatched yet'}
                </p>
                <p className="text-[11px] text-stone-400">
                  {lang === 'am'
                    ? 'ከግራ በኩል ያለውን ቅጽ በመጠቀም የመጀመሪያውን ማስታወቂያ ይላኩ።'
                    : 'Use the form on the left to broadcast your first message.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {notifications.map((n) => {
                  const displayTitle = pick(n.title, n.amharicTitle);
                  const displayContent = pick(n.content, n.amharicContent);
                  const readCount = n._count?.recipients || 0;

                  return (
                    <div
                      key={n.id}
                      className="p-4 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          {n.targetType === 'BROADCAST' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              <Megaphone className="w-3 h-3 text-purple-600" />
                              <span>{lang === 'am' ? 'ለሁሉም' : 'Broadcast'}</span>
                            </span>
                          )}

                          {n.targetType === 'BY_GRADE' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <GraduationCap className="w-3 h-3 text-blue-600" />
                              <span>
                                {n.targetGrade?.name
                                  ? pick(n.targetGrade.name, n.targetGrade.amharicName)
                                  : (lang === 'am' ? 'የተወሰነ ክፍል' : 'Grade Specific')}
                              </span>
                            </span>
                          )}

                          {n.targetType === 'BY_ROLE' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Users className="w-3 h-3 text-amber-600" />
                              <span>{n.targetRole}</span>
                            </span>
                          )}

                          <span className="text-[10px] text-stone-500 font-medium">
                            {readCount} {lang === 'am' ? 'ተጠቃሚዎች አንብበውታል' : 'readers'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title={lang === 'am' ? 'አጥፋ' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-bold text-xs text-stone-900 leading-snug">
                        {displayTitle}
                      </h3>

                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed whitespace-pre-line">
                        {displayContent}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[10px] text-stone-400">
                        <span>
                          {lang === 'am' ? 'ከላኪ፡' : 'Sender:'} <span className="font-semibold text-stone-600">{n.sender?.fullName || 'Admin'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
