'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Megaphone,
  GraduationCap,
  Users,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type { NotificationItem } from '@eotc/shared';

interface NotificationLink {
  href: string;
  labelEn: string;
  labelAm: string;
}

/** Maps workflow notifications (review requests / review results) to the page where the user acts on them. */
function getNotificationLink(n: NotificationItem): NotificationLink | null {
  const title = n.title || '';

  // Explicit link stored with the notification wins
  if (n.linkUrl) {
    if (/^\/chapters\//.test(n.linkUrl)) {
      return { href: n.linkUrl, labelEn: 'Try the practice questions', labelAm: 'የልምምድ ጥያቄዎችን ሞክር' };
    }
    if (n.linkUrl.startsWith('/admin/moderation')) {
      const isReference = /tab=references/.test(n.linkUrl);
      return {
        href: n.linkUrl,
        labelEn: isReference ? 'Review reference materials' : 'Review practice questions',
        labelAm: isReference ? 'ማጣቀሻዎችን ገምግም' : 'የልምምድ ጥያቄዎችን ገምግም',
      };
    }
    if (n.linkUrl.startsWith('/teacher')) {
      return { href: n.linkUrl, labelEn: 'View my submissions', labelAm: 'ያቀረብኳቸውን ተመልከት' };
    }
    return { href: n.linkUrl, labelEn: 'Open', labelAm: 'ክፈት' };
  }

  if (n.targetType !== 'BY_ROLE') return null;

  if (n.targetRole === 'ADMIN' && /Pending Review|New Reference Submission/i.test(title)) {
    const isReference = /Reference/i.test(title);
    return {
      href: isReference ? '/admin/moderation?tab=references' : '/admin/moderation?tab=questions',
      labelEn: isReference ? 'Review reference materials' : 'Review practice questions',
      labelAm: isReference ? 'ማጣቀሻዎችን ገምግም' : 'የልምምድ ጥያቄዎችን ገምግም',
    };
  }

  if (n.targetRole === 'TEACHER' && /Approved|Needs Revision/i.test(title)) {
    return {
      href: '/teacher?tab=submissions',
      labelEn: 'View my submissions',
      labelAm: 'ያቀረብኳቸውን ተመልከት',
    };
  }

  return null;
}

export function NotificationBell({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const router = useRouter();
  const { lang, pick } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Check periodically every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);

    const handleAuthChange = () => {
      fetchNotifications();
    };
    window.addEventListener('eotc:auth-change', handleAuthChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('eotc:auth-change', handleAuthChange);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return lang === 'am' ? 'አሁን' : 'Just now';
      if (diffMins < 60) return `${diffMins} ${lang === 'am' ? 'ደቂቃ በፊት' : 'm ago'}`;
      if (diffHours < 24) return `${diffHours} ${lang === 'am' ? 'ሰዓት በፊት' : 'h ago'}`;
      return `${diffDays} ${lang === 'am' ? 'ቀን በፊት' : 'd ago'}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className={`relative p-2 rounded-full transition ${
          variant === 'light'
            ? 'text-stone-600 dark:text-slate-300 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700'
            : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] leading-none font-bold text-white bg-rose-600 rounded-full ring-2 ${
              variant === 'light' ? 'ring-stone-100 dark:ring-slate-800' : 'ring-slate-900'
            }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-2 top-16 md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 w-auto md:w-96 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-stone-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm">
                {lang === 'am' ? 'ማስታወቂያዎች' : 'Announcements'}
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white">
                  {unreadCount} {lang === 'am' ? 'አዲስ' : 'new'}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                  title={lang === 'am' ? 'ሁሉንም የተነበቡ አድርግ' : 'Mark all as read'}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{lang === 'am' ? 'ሁሉንም አንብብ' : 'Mark all'}</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-stone-100 dark:divide-slate-800">
            {loading ? (
              <div className="py-10 text-center text-stone-400 dark:text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                <span className="text-xs">{lang === 'am' ? 'በመጫን ላይ...' : 'Loading notifications...'}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-stone-400 dark:text-slate-500 space-y-2">
                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-stone-400 dark:text-slate-500">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-stone-600 dark:text-slate-300">
                  {lang === 'am' ? 'ምንም አዲስ ማስታወቂያ የለም' : 'No notifications right now'}
                </p>
                <p className="text-[11px] text-stone-400 dark:text-slate-500 max-w-xs mx-auto">
                  {lang === 'am'
                    ? 'አስተዳዳሪዎች የሚያስተላልፏቸው መልእክቶችና የክፍል ማስታወቂያዎች እዚህ ይደርሳሉ።'
                    : 'Announcements from teachers and administrators will appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const title = pick(n.title, n.amharicTitle);
                const content = pick(n.content, n.amharicContent);
                const linkTarget = getNotificationLink(n);

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) handleMarkAsRead(n.id);
                      if (linkTarget) {
                        setIsOpen(false);
                        router.push(linkTarget.href);
                      }
                    }}
                    className={`p-3.5 transition cursor-pointer text-left ${
                      n.isRead
                        ? 'bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800/70'
                        : 'bg-amber-50/60 dark:bg-amber-500/10 hover:bg-amber-50 dark:hover:bg-amber-500/15 border-l-4 border-amber-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      {/* Target Audience Badge */}
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        {n.targetType === 'BROADCAST' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                            <Megaphone className="w-3 h-3 text-purple-600 dark:text-purple-300" />
                            <span>{lang === 'am' ? 'አጠቃላይ ማስታወቂያ' : 'Broadcast'}</span>
                          </span>
                        )}

                        {n.targetType === 'BY_GRADE' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                            <GraduationCap className="w-3 h-3 text-blue-600 dark:text-blue-300" />
                            <span>{n.targetGradeName || (lang === 'am' ? 'የክፍል ማስታወቂያ' : 'Grade Specific')}</span>
                          </span>
                        )}

                        {n.targetType === 'BY_ROLE' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                            <Users className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                            <span>{n.targetRole}</span>
                          </span>
                        )}

                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-[10px] text-stone-400 dark:text-slate-500 flex items-center space-x-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(n.createdAt)}</span>
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-stone-900 dark:text-white mt-1 leading-snug">
                      {title}
                    </h4>

                    <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {content}
                    </p>

                    {linkTarget && (
                      <div className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        {lang === 'am' ? linkTarget.labelAm : linkTarget.labelEn} →
                      </div>
                    )}

                    {n.senderName && (
                      <div className="mt-2 text-[10px] text-stone-400 dark:text-slate-500">
                        {lang === 'am' ? 'ከላኪ፡' : 'From:'} <span className="font-semibold text-stone-600 dark:text-slate-300">{n.senderName}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
