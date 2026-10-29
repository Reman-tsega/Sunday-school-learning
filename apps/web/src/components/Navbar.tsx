'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Download,
  Wifi,
  WifiOff,
  User,
  RefreshCw,
  Shield,
  LogOut,
  Globe,
  Menu,
  X,
  BookOpen,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Info,
  MessageSquare,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { syncManager, type SyncState } from '@/lib/sync-manager';
import { useLanguage } from '@/lib/language-context';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const { lang, toggleLang } = useLanguage();
  const [isOnline, setIsOnline] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    pendingCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
  });
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const isAuthenticated = Boolean(userName);

  const handleSyncClick = async () => {
    try {
      setSyncToast({
        type: 'info',
        text: lang === 'am' ? 'መረጃዎችን በማመሳሰል ላይ...' : 'Synchronizing offline records...',
      });
      const result = await syncManager.triggerSync();
      if (result) {
        const count = (result.syncedCount || 0) + (result.progressSynced || 0);
        setSyncToast({
          type: 'success',
          text:
            lang === 'am'
              ? `${count} የትምህርት ሂደቶች በተሳካ ሁኔታ ተመሳስለዋል!`
              : `Successfully synchronized ${count} progress records!`,
        });
      } else {
        setSyncToast({
          type: 'success',
          text: lang === 'am' ? 'ሁሉም መረጃዎች የተመሳሰሉ ናቸው።' : 'All records are already up to date.',
        });
      }
    } catch (err: any) {
      setSyncToast({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ማመሳሰል አልተሳካም።' : 'Sync failed. Please try again.'),
      });
    } finally {
      setTimeout(() => setSyncToast(null), 5000);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    const unsubscribeSync = syncManager.subscribe((state) => {
      setSyncState(state);
    });

    const unsubscribeAuth = api.onAuthChange((user) => {
      if (user) {
        setUserName(user.fullName || user.email);
        setUserRole(user.role);
      } else {
        setUserName(null);
        setUserRole(null);
      }
    });

    api.init().catch(console.error);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
      unsubscribeAuth();
    };
  }, []);

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll and listen for Escape key when mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await api.logout();
    router.push('/login');
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  // Role-based brand link: Admin goes to /admin, others to /
  const brandHref = userRole === 'ADMIN' ? '/admin' : '/';

  return (
    <nav className={`bg-eotc-navy text-white shadow-md sticky top-0 z-50 ${isAdminRoute ? 'hidden md:block' : ''}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center">
          {/* Brand Logo & Title */}
          <Link href={brandHref} onClick={handleNavClick} className="flex items-center space-x-2 sm:space-x-3 shrink min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-eotc-gold flex items-center justify-center text-eotc-navy font-bold text-base sm:text-xl shadow shrink-0">
              ✞
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs sm:text-base md:text-lg tracking-wide block truncate max-w-[110px] min-[380px]:max-w-[150px] sm:max-w-none">
                {lang === 'am' ? 'ሰንበት ት/ቤት' : 'EOTC Sunday School'}
              </span>
              <span className="hidden sm:block text-[10px] sm:text-xs text-amber-200 truncate">
                {userRole === 'ADMIN'
                  ? (lang === 'am' ? 'የአስተዳዳሪ ስቱዲዮ' : 'Admin Management Studio')
                  : (lang === 'am' ? 'ኦርቶዶክሳዊ የመማሪያ መድረክ' : 'Orthodox Learning Platform')}
              </span>
            </div>
          </Link>

          {/* ============================================================== */}
          {/* DESKTOP NAVIGATION ROW (hidden on mobile screens)              */}
          {/* ============================================================== */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
            {/* 1. Center Nav Links */}
            <div className="flex items-center space-x-1 lg:space-x-1.5 mr-2">
              {!isAuthenticated ? (
                /* Public Guest Links */
                <>
                  <Link
                    href="/about"
                    className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                  >
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'am' ? 'ስለ መድረኩ' : 'About'}</span>
                  </Link>

                  <Link
                    href="/#curriculum-preview"
                    className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'am' ? 'ሥርዓተ ትምህርት' : 'Curriculum'}</span>
                  </Link>

                  <Link
                    href="/faq"
                    className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'am' ? 'ጥያቄዎች' : 'FAQ'}</span>
                  </Link>

                  <Link
                    href="/support"
                    className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'am' ? 'እርዳታ' : 'Support'}</span>
                  </Link>
                </>
              ) : (
                /* Authenticated User Links */
                <>
                  {isAdminRoute ? null : (
                    /* Non-Admin Page / Student View */
                    <>
                      <Link
                        href="/"
                        className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'am' ? 'ትምህርቶች' : 'Courses'}</span>
                      </Link>

                      {userRole !== 'ADMIN' && (
                        <Link
                          href="/download-manager"
                          className="flex items-center space-x-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 border border-amber-500/30 text-amber-300 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{lang === 'am' ? 'የወረዱ' : 'Downloads'}</span>
                        </Link>
                      )}

                      <Link
                        href="/about"
                        className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition"
                      >
                        <Info className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'am' ? 'ስለ መድረኩ' : 'About'}</span>
                      </Link>

                      <Link
                        href="/faq"
                        className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'am' ? 'ጥያቄዎች' : 'FAQ'}</span>
                      </Link>

                      <Link
                        href="/support"
                        className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'am' ? 'እርዳታ' : 'Support'}</span>
                      </Link>

                      {/* Teacher Portal ONLY for TEACHER role */}
                      {userRole === 'TEACHER' && (
                        <Link
                          href="/teacher"
                          className="flex items-center space-x-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-semibold px-2.5 py-1.5 rounded-lg transition"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'am' ? 'የመምህራን መድረክ' : 'Teacher Portal'}</span>
                        </Link>
                      )}

                      {userRole === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="flex items-center space-x-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-semibold px-2.5 py-1.5 rounded-lg transition"
                        >
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'am' ? 'አስተዳዳሪ' : 'Admin'}</span>
                        </Link>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* 2. Utility Group: Sync & Online ONLY for Authenticated Users */}
            {isAuthenticated && (
              <div className="flex items-center space-x-2 border-l border-slate-800 pl-2">
                {/* Sync Button */}
                <button
                  onClick={handleSyncClick}
                  disabled={syncState.status === 'syncing' || !isOnline}
                  title={
                    syncState.errorMessage ||
                    (lang === 'am'
                      ? `ውጤቶችንና ንባብን ከሰርቨር ጋር ያመሳስሉ (${syncState.pendingCount} ያልተመሳሰሉ)`
                      : `Sync progress with server (${syncState.pendingCount} pending)`)
                  }
                  className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    syncState.status === 'syncing'
                      ? 'bg-amber-900 text-amber-200 border border-amber-700 animate-pulse'
                      : syncState.pendingCount > 0
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      syncState.status === 'syncing' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {syncState.status === 'syncing'
                      ? (lang === 'am' ? 'በማመሳሰል ላይ...' : 'Syncing...')
                      : (lang === 'am' ? 'አመሳስል' : 'Sync')}
                  </span>
                  {syncState.pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] h-[18px] shadow-sm animate-pulse">
                      {syncState.pendingCount}
                    </span>
                  )}
                </button>

                {/* Online / Offline Status */}
                <div
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isOnline
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                  }`}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="w-3.5 h-3.5" />
                      <span>{lang === 'am' ? 'መስመር ላይ' : 'Online'}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>{lang === 'am' ? 'ከመስመር ውጭ' : 'Offline'}</span>
                    </>
                  )}
                </div>

                {/* Notification Bell */}
                <NotificationBell />
              </div>
            )}

            {/* 3. Utility Group: Day/Night Mode & Language Switchers */}
            <div className="flex items-center space-x-1.5">
              <ThemeToggle />
              <button
                onClick={toggleLang}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-amber-300 border border-amber-500/30 hover:border-amber-400/60 shadow-xs transition cursor-pointer"
                title={lang === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
                aria-label="Toggle language"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">{lang === 'am' ? 'English' : 'አማርኛ'}</span>
              </button>
            </div>

            {/* 4. Auth Actions: Profile / Logout vs Public Sign In / Register */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-1.5 pl-1.5 border-l border-slate-800">
                <Link
                  href="/profile"
                  title={lang === 'am' ? 'የግል መረጃ' : 'View Profile'}
                  className="flex items-center space-x-1.5 text-xs text-slate-200 bg-slate-800/80 hover:bg-slate-750 hover:border-amber-500/50 px-2.5 py-1.5 rounded-lg border border-slate-700 max-w-[150px] transition"
                >
                  <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{userName}</span>
                  {userRole === 'ADMIN' && (
                    <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1 py-0.5 rounded font-bold shrink-0">
                      {lang === 'am' ? 'አስተዳዳሪ' : 'Admin'}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  title={lang === 'am' ? 'ውጣ' : 'Sign Out'}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 pl-1.5 border-l border-slate-800">
                <Link
                  href="/login"
                  className="text-xs text-slate-200 hover:text-white font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                >
                  {lang === 'am' ? 'ግባ' : 'Sign In'}
                </Link>
                <Link
                  href="/login?mode=register"
                  className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg shadow transition"
                >
                  {lang === 'am' ? 'ተመዝገብ' : 'Register'}
                </Link>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MOBILE RIGHT CONTROLS                                         */}
          {/* ============================================================== */}
          <div className="flex md:hidden items-center space-x-1.5">
            {isAuthenticated ? (
              /* Authenticated Mobile Controls */
              <>
                {/* Mobile Sync Button (visible on sm+, available in drawer on smaller screens) */}
                <button
                  onClick={handleSyncClick}
                  disabled={syncState.status === 'syncing' || !isOnline}
                  className={`hidden sm:inline-flex relative p-1.5 rounded-lg transition ${
                    syncState.status === 'syncing'
                      ? 'bg-amber-900 text-amber-200 border border-amber-700 animate-pulse'
                      : syncState.pendingCount > 0
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={
                    lang === 'am'
                      ? `አመሳስል (${syncState.pendingCount} ያልተመሳሰሉ)`
                      : `Sync (${syncState.pendingCount} pending)`
                  }
                  aria-label="Synchronize offline data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncState.pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black rounded-full px-1 min-w-[15px] h-[15px] flex items-center justify-center shadow">
                      {syncState.pendingCount}
                    </span>
                  )}
                </button>

                {/* Mobile Notification Bell */}
                <NotificationBell />

                {/* Online Status Dot */}
                <div
                  className={`hidden sm:block w-2.5 h-2.5 rounded-full ${
                    isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'
                  }`}
                  title={isOnline ? (lang === 'am' ? 'መስመር ላይ' : 'Online') : (lang === 'am' ? 'ከመስመር ውጭ' : 'Offline')}
                />
              </>
            ) : (
              /* Guest Mobile View: Clean Sign In CTA */
              <Link
                href="/login"
                className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold px-2.5 py-1 rounded-lg transition"
              >
                {lang === 'am' ? 'ግባ' : 'Sign In'}
              </Link>
            )}

            {/* Mobile Theme & Language Buttons */}
            <ThemeToggle variant="compact" />
            <button
              onClick={toggleLang}
              className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition flex items-center space-x-1"
              aria-label="Toggle language"
              title={lang === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
            >
              <Globe className="w-3 h-3 text-amber-400" />
              <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
            </button>

            {/* Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE DRAWER OVERLAY (Fixed Off-Canvas Drawer over Page)       */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end" role="dialog" aria-modal="true" aria-label="Main Navigation Menu">
          {/* 1. Backdrop Blur Overlay (Tapping closes drawer) */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* 2. Slide-out Off-Canvas Drawer (Stays fixed over page, scrolls internally) */}
          <aside className="relative w-80 max-w-[85vw] bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-right duration-250 ease-out">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-eotc-gold flex items-center justify-center text-eotc-navy font-bold text-base shadow shrink-0">
                  ✞
                </div>
                <div>
                  <span className="font-bold text-sm tracking-wide text-white block">
                    {lang === 'am' ? 'ሰንበት ት/ቤት' : 'Sunday School'}
                  </span>
                  <span className="text-[10px] text-amber-300 block">
                    {userRole === 'ADMIN'
                      ? (lang === 'am' ? 'የአስተዳዳሪ ስቱዲዮ' : 'Admin Studio')
                      : (lang === 'am' ? 'የመማሪያ መድረክ' : 'Learning Platform')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5 text-amber-400" />
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
              {/* Header Card in Mobile Menu */}
              {isAuthenticated ? (
                /* Logged-in User Profile Strip */
                <div className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
                  <Link
                    href="/profile"
                    onClick={handleNavClick}
                    className="flex items-center space-x-2 hover:opacity-85 transition"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm truncate max-w-[170px]">{userName}</div>
                      <div className="text-[11px] text-amber-300 font-semibold">
                        {userRole === 'ADMIN'
                          ? (lang === 'am' ? 'አስተዳዳሪ (Admin)' : 'Administrator')
                          : (lang === 'am' ? 'ተማሪ (Student)' : 'Student')}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-2.5 py-1 text-xs text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 rounded-lg flex items-center space-x-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{lang === 'am' ? 'ውጣ' : 'Sign Out'}</span>
                  </button>
                </div>
              ) : (
                /* Guest Dual Sign-In & Register Action */
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={handleNavClick}
                    className="text-center py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition"
                  >
                    {lang === 'am' ? 'ግባ / Sign In' : 'Sign In'}
                  </Link>
                  <Link
                    href="/login?mode=register"
                    onClick={handleNavClick}
                    className="text-center py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow transition flex items-center justify-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'am' ? 'ተመዝገብ' : 'Register'}</span>
                  </Link>
                </div>
              )}

              {/* Navigation Links based on role / authentication */}
              <div className="space-y-1.5 pt-1">
                {!isAuthenticated ? (
                  /* Public Links in Mobile Drawer */
                  <>
                    <Link
                      href="/"
                      onClick={handleNavClick}
                      className="flex items-center space-x-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                    >
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'am' ? 'መነሻ ገጽ' : 'Home'}</span>
                    </Link>

                    <Link
                      href="/#curriculum-preview"
                      onClick={handleNavClick}
                      className="flex items-center space-x-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                    >
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'am' ? 'ሥርዓተ ትምህርት' : 'Curriculum'}</span>
                    </Link>
                  </>
                ) : userRole === 'ADMIN' ? (
                  /* Admin Links in Mobile Drawer */
                  <>
                    {!isAdminRoute && (
                      <>
                        <Link
                          href="/admin"
                          onClick={handleNavClick}
                          className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs"
                        >
                          <Shield className="w-4 h-4 text-amber-400" />
                          <span>{lang === 'am' ? 'ወደ አስተዳዳሪ ስቱዲዮ' : 'Admin Control Studio'}</span>
                        </Link>

                        <Link
                          href="/"
                          onClick={handleNavClick}
                          className="flex items-center space-x-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                        >
                          <BookOpen className="w-4 h-4 text-amber-400" />
                          <span>{lang === 'am' ? 'የተማሪዎች እይታ (ትምህርቶች)' : 'Student View (Courses)'}</span>
                        </Link>
                      </>
                    )}
                  </>
                ) : userRole === 'TEACHER' ? (
                  /* Teacher Links in Mobile Drawer */
                  <>
                    <Link
                      href="/teacher"
                      onClick={handleNavClick}
                      className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs"
                    >
                      <GraduationCap className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'am' ? 'የመምህራን መድረክ' : 'Teacher Portal'}</span>
                    </Link>

                    <Link
                      href="/"
                      onClick={handleNavClick}
                      className="flex items-center space-x-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                    >
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'am' ? 'ሥርዓተ ትምህርት' : 'Curriculum Courses'}</span>
                    </Link>
                  </>
                ) : (
                  /* Authenticated Student Links in Mobile Drawer */
                  <>
                    <Link
                      href="/"
                      onClick={handleNavClick}
                      className="flex items-center space-x-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                    >
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'am' ? 'ሥርዓተ ትምህርት' : 'Curriculum Courses'}</span>
                    </Link>

                    <Link
                      href="/download-manager"
                      onClick={handleNavClick}
                      className="flex items-center space-x-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'am' ? 'የወረዱ መጻሕፍት' : 'Offline Downloads'}</span>
                    </Link>
                  </>
                )}

                {/* Common informational links */}
                {!isAdminRoute && (
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1.5">
                    <Link
                      href="/about"
                      onClick={handleNavClick}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-center text-xs font-semibold"
                    >
                      <Info className="w-4 h-4 text-amber-400 mb-1" />
                      <span className="truncate">{lang === 'am' ? 'ስለ እኛ' : 'About'}</span>
                    </Link>

                    <Link
                      href="/faq"
                      onClick={handleNavClick}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-center text-xs font-semibold"
                    >
                      <HelpCircle className="w-4 h-4 text-amber-400 mb-1" />
                      <span className="truncate">{lang === 'am' ? 'ጥያቄዎች' : 'FAQ'}</span>
                    </Link>

                    <Link
                      href="/support"
                      onClick={handleNavClick}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-center text-xs font-semibold"
                    >
                      <MessageSquare className="w-4 h-4 text-amber-400 mb-1" />
                      <span className="truncate">{lang === 'am' ? 'እርዳታ' : 'Support'}</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Sync in Mobile Menu - ONLY for Authenticated Users */}
            {isAuthenticated && (
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 shrink-0">
                <div className="flex items-center space-x-1.5">
                  {isOnline ? (
                    <span className="flex items-center text-emerald-400 font-semibold">
                      <Wifi className="w-3.5 h-3.5 mr-1" />
                      {lang === 'am' ? 'መስመር ላይ' : 'Online'}
                    </span>
                  ) : (
                    <span className="flex items-center text-amber-400 font-semibold">
                      <WifiOff className="w-3.5 h-3.5 mr-1" />
                      {lang === 'am' ? 'ከመስመር ውጭ' : 'Offline'}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSyncClick}
                  disabled={syncState.status === 'syncing' || !isOnline}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    syncState.pendingCount > 0
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>
                    {syncState.status === 'syncing'
                      ? (lang === 'am' ? 'በማመሳሰል ላይ...' : 'Syncing...')
                      : (lang === 'am' ? 'አመሳስል' : 'Sync Now')}
                  </span>
                  {syncState.pendingCount > 0 && (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                      {syncState.pendingCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Sync Status Toast Banner */}
      {syncToast && (
        <div
          className={`border-b px-4 py-2 flex items-center justify-between text-xs backdrop-blur-md transition-all shadow-md ${
            syncToast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
              : syncToast.type === 'error'
              ? 'bg-red-950/95 border-red-800 text-red-200'
              : 'bg-amber-950/95 border-amber-800 text-amber-200'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {syncToast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
              {syncToast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              {syncToast.type === 'info' && <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />}
              <span className="font-semibold">{syncToast.text}</span>
              {syncToast.type === 'error' && syncToast.text.includes('sign in') && (
                <Link
                  href="/login"
                  className="ml-2 underline font-bold text-amber-300 hover:text-white"
                >
                  {lang === 'am' ? 'ይግቡ' : 'Sign in'}
                </Link>
              )}
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="text-slate-400 hover:text-white ml-4 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
