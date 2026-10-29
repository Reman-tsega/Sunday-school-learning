'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ShieldAlert,
  Loader2,
  Sparkles,
  LogOut,
  Menu,
  X,
  GraduationCap,
  MessageSquare,
  Bell,
  ShieldCheck,
  Church,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-close mobile drawer on route navigation
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

  useEffect(() => {
    api.init().then(() => {
      const user = api.getUser();
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        setIsAdmin(false);
        setIsLoading(false);
      } else {
        setIsAdmin(true);
        setIsLoading(false);
      }
    });
  }, [router]);

  // 15-Minute Inactivity Auto-Logout & Active Silent Refresh for Admin
  useEffect(() => {
    if (!isAdmin) return;

    let lastActivityTime = Date.now();
    const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    const markActive = () => {
      lastActivityTime = Date.now();
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, markActive, { passive: true });
    });

    // Check idle timeout every 20 seconds
    const idleTimer = setInterval(async () => {
      const elapsed = Date.now() - lastActivityTime;
      if (elapsed >= IDLE_LIMIT_MS) {
        clearInterval(idleTimer);
        await api.logout();
        router.push('/login?reason=idle_timeout');
      }
    }, 20000);

    // Silent refresh every 5 minutes while admin is actively interacting
    const refreshTimer = setInterval(async () => {
      const elapsed = Date.now() - lastActivityTime;
      if (elapsed < IDLE_LIMIT_MS) {
        try {
          await api.refreshSession();
        } catch {
          // Ignore transient network errors
        }
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, markActive);
      });
      clearInterval(idleTimer);
      clearInterval(refreshTimer);
    };
  }, [isAdmin, router]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-slate-900 flex items-center justify-center text-stone-600 dark:text-slate-300 transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400 mr-3" />
        <span>{lang === 'am' ? 'የአስተዳዳሪ ማረጋገጫ በመፈተሽ ላይ...' : 'Verifying admin authorization...'}</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white dark:bg-slate-800 border border-red-500/30 rounded-xl p-8 max-w-md w-full text-center shadow-xl">
          <ShieldAlert className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
            {lang === 'am' ? 'ይቅርታ፣ ፈቃድ የለዎትም' : 'Access Denied'}
          </h2>
          <p className="text-stone-600 dark:text-slate-400 text-sm mb-6">
            {lang === 'am'
              ? 'ይህ ገጽ ለአስተዳዳሪዎች ብቻ የተፈቀደ ነው። እባክዎ በአስተዳዳሪ አካውንት ይግቡ።'
              : 'This section is restricted to administrators. Please sign in with an admin account.'}
          </p>
          <div className="flex justify-center space-x-3">
            <Link
              href="/"
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white rounded-lg text-sm font-medium transition"
            >
              {lang === 'am' ? 'ወደ ዋናው ገጽ ተመለስ' : 'Return to Student View'}
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition"
            >
              {lang === 'am' ? 'በድጋሚ ግባ' : 'Sign In Again'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      name: lang === 'am' ? 'አጠቃላይ እይታ' : 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      name: lang === 'am' ? 'ተማሪዎችና ውጤት' : 'Students & Progress',
      href: '/admin/students',
      icon: GraduationCap,
      active: pathname.startsWith('/admin/students'),
    },
    {
      name: lang === 'am' ? 'ተጠቃሚዎች' : 'Users',
      href: '/admin/users',
      icon: Users,
      active: pathname.startsWith('/admin/users'),
    },
    {
      name: lang === 'am' ? 'ሰንበት ትምህርት ቤቶች' : 'Sunday Schools',
      href: '/admin/sunday-schools',
      icon: Church,
      active: pathname.startsWith('/admin/sunday-schools'),
    },
    {
      name: lang === 'am' ? 'ስርዓተ ትምህርት' : 'Curriculum',
      href: '/admin/curriculum',
      icon: BookOpen,
      active: pathname.startsWith('/admin/curriculum') || pathname.startsWith('/admin/chapters'),
    },
    {
      name: lang === 'am' ? 'ማስታወቂያዎች' : 'Broadcasts',
      href: '/admin/notifications',
      icon: Bell,
      active: pathname.startsWith('/admin/notifications'),
    },
    {
      name: lang === 'am' ? 'የእርዳታ ጥያቄዎች' : 'Support Desk',
      href: '/admin/support',
      icon: MessageSquare,
      active: pathname.startsWith('/admin/support'),
    },
    {
      name: lang === 'am' ? 'የይዘት ማጣሪያ' : 'Moderation Desk',
      href: '/admin/moderation',
      icon: ShieldCheck,
      active: pathname.startsWith('/admin/moderation'),
    },
    {
      name: lang === 'am' ? 'አይአይ ረዳት' : 'AI Studio',
      href: '/admin/ai',
      icon: Sparkles,
      active: pathname.startsWith('/admin/ai'),
    },
  ];

  return (
    <div data-admin-shell="true" className="min-h-screen bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors">
      {/* Mobile Top Header (only on mobile screens < md) */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
            ✞
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-stone-900 dark:text-white leading-tight">
              {lang === 'am' ? 'አስተዳዳሪ ፖርታል' : 'Admin Portal'}
            </h1>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
              {lang === 'am' ? 'የቁጥጥር ስቱዲዮ' : 'Control Studio'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <ThemeToggle variant="compact" />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-amber-500" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Off-Canvas Drawer Overlay (Fixed over the page, never scrolls with the page) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Admin Navigation Drawer">
          {/* 1. Backdrop Overlay (Tap outside to close) */}
          <div
            className="fixed inset-0 bg-stone-950/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* 2. Slide-out Off-Canvas Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-stone-200 dark:border-slate-800 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250 ease-out">
            {/* Drawer Header with Title & Close Button */}
            <div className="p-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between bg-stone-50/70 dark:bg-slate-800/40 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                  ✞
                </div>
                <div>
                  <h2 className="font-bold text-sm tracking-wide text-stone-900 dark:text-white leading-tight">
                    {lang === 'am' ? 'አስተዳዳሪ ፖርታል' : 'Admin Portal'}
                  </h2>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                    {lang === 'am' ? 'የቁጥጥር ስቱዲዮ' : 'Control Studio'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </button>
            </div>

            {/* Scrollable Navigation Items (Independent scroll within drawer, page body is locked) */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                      item.active
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold'
                        : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800/60 hover:text-stone-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Bottom Actions */}
            <div className="p-3 border-t border-stone-200 dark:border-slate-800 space-y-1.5 bg-stone-50/70 dark:bg-slate-800/40 shrink-0">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition font-medium"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>{lang === 'am' ? 'ወደ ተማሪዎች ገጽ' : 'Open Student Platform'}</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-xs text-rose-600 dark:text-red-400 hover:text-rose-700 dark:hover:text-red-300 hover:bg-rose-50 dark:hover:bg-red-950/40 rounded-lg transition font-medium"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>{lang === 'am' ? 'ውጣ' : 'Sign Out'}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (hidden on mobile, visible on md and up) */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-stone-200 dark:border-slate-800 flex-col flex-shrink-0 min-h-screen transition-colors shadow-xs">
        <div className="p-5 border-b border-stone-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            ✞
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-wide text-stone-900 dark:text-white truncate">
              {lang === 'am' ? 'አስተዳዳሪ ፖርታል' : 'Admin Portal'}
            </h1>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 truncate">
              {lang === 'am' ? 'የቁጥጥር ስቱዲዮ' : 'Control Studio'}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  item.active
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800/60 hover:text-stone-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 dark:text-red-400 hover:text-rose-700 dark:hover:text-red-300 hover:bg-rose-50 dark:hover:bg-red-950/40 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'am' ? 'ውጣ' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
