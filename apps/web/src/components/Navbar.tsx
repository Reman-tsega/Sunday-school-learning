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
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { watchConnectivity } from '@/lib/connectivity';
import { syncManager, type SyncState } from '@/lib/sync-manager';
import { useLanguage } from '@/lib/language-context';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { InstallButton } from './InstallApp';

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
    pendingItems: [],
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
              ? `የትምህርት ሂደትዎ ተሻሽሏል (${count})።`
              : `Your progress has been updated (${count} ${count === 1 ? 'record' : 'records'} synced).`,
        });
      } else {
        setSyncToast({
          type: 'info',
          text:
            lang === 'am'
              ? 'ሁሉም መረጃ አስቀድሞ ተሻሽሏል፤ ምንም የሚመሳሰል ለውጥ የለም።'
              : 'Already updated — there is nothing new to sync.',
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
    // Real reachability (server ping + browser events), not just the browser's connection flag
    const stopWatchingConnectivity = watchConnectivity(setIsOnline);

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
      stopWatchingConnectivity();
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
  const brandHref = userRole === 'ADMIN' ? '/admin' : userRole === 'TEACHER' ? '/teacher' : '/';

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
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
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
                </>
              ) : (
                /* Authenticated User Links */
                <>
                  {isAdminRoute ? null : (
                    /* Non-Admin Page / Student View */
                    <>
                      {userRole === 'STUDENT' && (
                        <Link
                          href="/"
                          className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'am' ? 'ትምህርቶች' : 'Courses'}</span>
                        </Link>
                      )}

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
                      ? `ውጤቶችንና ንባብን ከሰርቨር ጋር ያመሳስሉ (${syncState.pendingCount} ያልተመሳሰሉ)${syncState.pendingItems.length ? '\n• ' + syncState.pendingItems.join('\n• ') : ''}`
                      : `Sync progress with server (${syncState.pendingCount} pending)${syncState.pendingItems.length ? '\n• ' + syncState.pendingItems.join('\n• ') : ''}`)
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
                  <span className="hidden xl:inline">
                    {syncState.status === 'syncing'
                      ? (lang === 'am' ? 'በማመሳሰል ላይ...' : 'Syncing...')
                      : (lang === 'am' ? 'አመሳስል' : 'Sync')}
                  </span>
                  {syncState.pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center bg-rose-600 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] h-[18px]">
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
                      <span className="hidden xl:inline">{lang === 'am' ? 'መስመር ላይ' : 'Online'}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline">{lang === 'am' ? 'ከመስመር ውጭ' : 'Offline'}</span>
                    </>
                  )}
                </div>

                {/* Notification Bell */}
                <NotificationBell />
              </div>
            )}

            {/* 3. Utility Group: Day/Night Mode & Language Switchers */}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
              {isAuthenticated && userRole === 'STUDENT' && (
                <Link
                  href="/download-manager"
                  title={lang === 'am' ? 'የወረዱ መጻሕፍት' : 'Offline Downloads'}
                  aria-label={lang === 'am' ? 'የወረዱ መጻሕፍት' : 'Offline Downloads'}
                  className={`p-1.5 rounded-full border transition flex items-center justify-center ${
                    pathname?.startsWith('/download-manager')
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/30 hover:border-amber-400/60'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                </Link>
              )}
              <InstallButton />
              <ThemeToggle variant="icon" />
              <button
                onClick={toggleLang}
                className="p-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-400/60 transition cursor-pointer flex items-center justify-center"
                title={lang === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
                aria-label={lang === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
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
                  className={`${syncState.pendingCount > 0 ? 'inline-flex' : 'hidden sm:inline-flex'} relative p-1.5 rounded-lg transition ${
                    syncState.status === 'syncing'
                      ? 'bg-amber-900 text-amber-200 border border-amber-700 animate-pulse'
                      : syncState.pendingCount > 0
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={
                    (lang === 'am'
                      ? `አመሳስል (${syncState.pendingCount} ያልተመሳሰሉ)`
                      : `Sync (${syncState.pendingCount} pending)`) +
                    (syncState.pendingItems.length ? '\n• ' + syncState.pendingItems.join('\n• ') : '')
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
            ) : null}

            {/* Mobile Theme & Language Buttons */}
            <InstallButton />
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
              className="p-1.5 rounded-lg text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label={
                mobileMenuOpen
                  ? (lang === 'am' ? 'የዳሰሳ ምናሌ ዝጋ' : 'Close navigation menu')
                  : (lang === 'am' ? 'የዳሰሳ ምናሌ ክፈት' : 'Open navigation menu')
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE TOP DROPDOWN PANEL (Expands downward from header)       */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <>
          {/* 1. Backdrop Overlay (dims page beneath, tap outside closes) */}
          <div
            className="fixed inset-0 top-14 sm:top-16 bg-slate-950/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* 2. Top-Anchored Dropdown Panel */}
          <div
            id="mobile-nav-panel"
            role="region"
            aria-label={lang === 'am' ? 'የሞባይል ዳሰሳ ምናሌ' : 'Mobile Navigation Menu'}
            className="absolute top-full left-0 right-0 z-50 md:hidden px-3 sm:px-4 pt-2 pb-4 pointer-events-auto animate-in slide-in-from-top-2 fade-in duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none"
          >
            <div className="w-full max-w-lg mx-auto bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 sm:p-3 space-y-2 max-h-[calc(100dvh-5rem)] overflow-y-auto">
              {/* SECTION 1: ACCOUNT / AUTHENTICATION */}
              {isAuthenticated ? (
                /* Authenticated User Header Card */
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                  <Link
                    href="/profile"
                    onClick={handleNavClick}
                    className="flex items-center space-x-2.5 min-w-0 flex-1 hover:opacity-90 transition group"
                    aria-label={lang === 'am' ? 'የተጠቃሚ መገለጫ ገጽ' : 'User profile'}
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-xs truncate max-w-[200px]">
                        {userName}
                      </div>
                      <div className="text-[11px] text-amber-300 font-medium truncate">
                        {userRole === 'ADMIN'
                          ? (lang === 'am' ? 'አስተዳዳሪ (Admin)' : 'Administrator')
                          : userRole === 'TEACHER'
                          ? (lang === 'am' ? 'መምህር (Teacher)' : 'Teacher')
                          : (lang === 'am' ? 'የተማሪ አካውንት' : 'Student Account')}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition shrink-0" />
                  </Link>
                </div>
              ) : (
                /* Guest Dual Sign-In & Register */
                <div className="grid grid-cols-2 gap-2 p-0.5">
                  <Link
                    href="/login"
                    onClick={handleNavClick}
                    className="flex items-center justify-center py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition min-h-[44px]"
                  >
                    {lang === 'am' ? 'ግባ / Sign In' : 'Sign In'}
                  </Link>
                  <Link
                    href="/login?mode=register"
                    onClick={handleNavClick}
                    className="flex items-center justify-center py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow transition space-x-1 min-h-[44px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'am' ? 'ተመዝገብ' : 'Register'}</span>
                  </Link>
                </div>
              )}

              {/* SECTION 2: PRIMARY NAVIGATION */}
              <div className="space-y-1 pt-0.5">
                {userRole === 'ADMIN' ? (
                  <>
                    <Link
                      href="/admin"
                      onClick={handleNavClick}
                      aria-current={pathname?.startsWith('/admin') ? 'page' : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                        pathname?.startsWith('/admin')
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <span>{lang === 'am' ? 'ወደ አስተዳዳሪ ስቱዲዮ' : 'Admin Control Studio'}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </Link>

                    <Link
                      href="/"
                      onClick={handleNavClick}
                      aria-current={pathname === '/' ? 'page' : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                        pathname === '/'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <span>{lang === 'am' ? 'የተማሪዎች እይታ (ትምህርቶች)' : 'Student View (Courses)'}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </Link>
                  </>
                ) : userRole === 'TEACHER' ? (
                  <>
                    <Link
                      href="/teacher"
                      onClick={handleNavClick}
                      aria-current={pathname?.startsWith('/teacher') ? 'page' : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                        pathname?.startsWith('/teacher')
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <span>{lang === 'am' ? 'የመምህራን መድረክ' : 'Teacher Portal'}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/"
                      onClick={handleNavClick}
                      aria-current={(pathname === '/' || pathname?.startsWith('/chapters')) ? 'page' : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                        (pathname === '/' || pathname?.startsWith('/chapters'))
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <span>{lang === 'am' ? 'ሥርዓተ ትምህርት' : 'Curriculum Courses'}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </Link>

                    {isAuthenticated && (
                      <Link
                        href="/download-manager"
                        onClick={handleNavClick}
                        aria-current={pathname?.startsWith('/download-manager') ? 'page' : undefined}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                          pathname?.startsWith('/download-manager')
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4" />
                          </div>
                          <span>{lang === 'am' ? 'የወረዱ መጻሕፍት' : 'Offline Downloads'}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </Link>
                    )}
                  </>
                )}
              </div>

              {/* SECTION 3: SECONDARY NAVIGATION (About, FAQ, Support) */}
              {!isAdminRoute && (
                <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                  {/* About & FAQ: public visitors only */}
                  {!isAuthenticated && (
                    <>
                  <Link
                    href="/about"
                    onClick={handleNavClick}
                    aria-current={pathname === '/about' ? 'page' : undefined}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                      pathname === '/about'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                        <Info className="w-4 h-4" />
                      </div>
                      <span>{lang === 'am' ? 'ስለ እኛ' : 'About'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </Link>

                  <Link
                    href="/faq"
                    onClick={handleNavClick}
                    aria-current={pathname === '/faq' ? 'page' : undefined}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                      pathname === '/faq'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <span>{lang === 'am' ? 'ጥያቄዎች' : 'FAQ'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </Link>

                    </>
                  )}

                  {/* Support: signed-in users only */}
                  {isAuthenticated && (
                    <>
                  <Link
                    href="/support"
                    onClick={handleNavClick}
                    aria-current={pathname === '/support' ? 'page' : undefined}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                      pathname === '/support'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span>{lang === 'am' ? 'እርዳታ' : 'Support'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </Link>
                    </>
                  )}
                </div>
              )}

              {/* SECTION 4: UTILITY ACTIONS (Sync Now, Online Status, Sign Out) */}
              {isAuthenticated && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  {/* Status & Sync Row */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60 min-h-[44px]">
                    <div className="flex items-center space-x-1.5 pl-1">
                      {isOnline ? (
                        <span className="flex items-center text-emerald-400 font-semibold text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                          {lang === 'am' ? 'መስመር ላይ' : 'Online'}
                        </span>
                      ) : (
                        <span className="flex items-center text-amber-400 font-semibold text-xs">
                          <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" />
                          {lang === 'am' ? 'ከመስመር ውጭ' : 'Offline'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncClick}
                      disabled={syncState.status === 'syncing' || !isOnline}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        syncState.pendingCount > 0
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
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

                  {/* Sign Out Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/50 rounded-xl transition font-semibold min-h-[44px]"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{lang === 'am' ? 'ውጣ' : 'Sign Out'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
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
              {syncToast.type === 'info' && (
                syncState.status === 'syncing' ? (
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                )
              )}
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
