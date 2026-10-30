'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  Shield,
  GraduationCap,
  CheckCircle,
  Clock,
  Church,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type { UserProfile } from '@eotc/shared';
import ParishCombobox from '@/components/ParishCombobox';

interface AvailableGrade {
  id: string;
  level: number;
  name: string;
  amharicName?: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  // The notice is shown once, and only if a forced logout really just happened in this tab
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem('eotc_session_notice');
      sessionStorage.removeItem('eotc_session_notice');
    } catch {
      /* storage unavailable */
    }
    if (reason && stored) setNotice(stored);
    if (reason) {
      // Strip the reason from the address bar so reloads/bookmarks don't repeat the message
      const url = new URL(window.location.href);
      url.searchParams.delete('reason');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isIdleTimeout = notice === 'idle_timeout';
  const isSessionExpired = notice === 'session_expired' || notice === 'invalid_token';
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const redirectParam = searchParams.get('redirect');

  const { lang, pick } = useLanguage();
  const [tab, setTab] = useState<'login' | 'register'>(initialMode);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAge, setRegAge] = useState<string>('');
  const [regAddress, setRegAddress] = useState('');
  const [regBaptismalName, setRegBaptismalName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regChurchParish, setRegChurchParish] = useState('');
  const [regParishId, setRegParishId] = useState<string | null>(null);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);

  const [availableGrades, setAvailableGrades] = useState<AvailableGrade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Active rate-limit countdown interval
  useEffect(() => {
    if (rateLimitSeconds === null || rateLimitSeconds <= 0) return;
    const timer = setInterval(() => {
      setRateLimitSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    api.init().then((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });

    // Fetch available grades for registration
    setLoadingGrades(true);
    api.getCurriculum()
      .then((grades: any[]) => {
        if (Array.isArray(grades)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped = grades.map((g: any, index: number) => ({
            id: g.id || (g.level != null ? `grade-level-${g.level}` : `grade-${index}`),
            level: g.level,
            name: g.name,
            amharicName: g.amharicName,
          })).sort((a, b) => a.level - b.level);
          setAvailableGrades(mapped);
          // Default select first grade if available
          const first = mapped[0];
          if (first && first.id && selectedGradeIds.length === 0) {
            setSelectedGradeIds([first.id]);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load grades for registration:', err);
      })
      .finally(() => {
        setLoadingGrades(false);
      });
  }, []);

  const handleLoginSubmit = async (loginEmail: string, loginPass: string) => {
    if (rateLimitSeconds !== null && rateLimitSeconds > 0) return;
    setLoading(true);
    setError(null);

    try {
      const auth = await api.login(loginEmail, loginPass);
      if (auth.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (auth.user.role === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push(redirectParam || '/');
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED')) {
        const remaining = err.retryAfterSeconds || 900;
        setRateLimitSeconds(remaining);
        setError(
          lang === 'am'
            ? (err.amharicMessage || 'ከተፈቀደው በላይ የመግቢያ ሙከራ ተደርጓል፤ እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ።')
            : err.message
        );
      } else {
        setError((err as Error).message || (lang === 'am' ? 'መግባት አልተቻለም' : 'Login failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimitSeconds !== null && rateLimitSeconds > 0) return;
    setLoading(true);
    setError(null);

    const parsedAge = regAge ? parseInt(regAge, 10) : undefined;
    if (parsedAge !== undefined && (isNaN(parsedAge) || parsedAge < 3 || parsedAge > 120)) {
      setError(lang === 'am' ? 'እባክዎ ትክክለኛ ዕድሜ ያስገቡ (ከ3 እስከ 120)' : 'Please enter a valid age (3-120)');
      setLoading(false);
      return;
    }

    if (selectedGradeIds.length === 0) {
      setError(lang === 'am' ? 'እባክዎ ቢያንስ አንድ የሚማሩበትን ክፍል ይምረጡ' : 'Please select at least one grade to enroll in');
      setLoading(false);
      return;
    }

    try {
      const auth = await api.register({
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        role: 'STUDENT',
        age: parsedAge,
        address: regAddress || undefined,
        baptismalName: regBaptismalName || undefined,
        phoneNumber: regPhone || undefined,
        churchParish: regChurchParish || undefined,
        parishId: regParishId || undefined,
        gradeIds: selectedGradeIds,
      });

      if (auth.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (auth.user.role === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push(redirectParam || '/');
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED')) {
        const remaining = err.retryAfterSeconds || 3600;
        setRateLimitSeconds(remaining);
        setError(
          lang === 'am'
            ? (err.amharicMessage || 'የመመዝገቢያ ገደብ ላይ ደርሰዋል፤ እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ።')
            : err.message
        );
      } else {
        setError((err as Error).message || (lang === 'am' ? 'ምዝገባ አልተሳካም' : 'Registration failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmin = () => {
    if (rateLimitSeconds !== null && rateLimitSeconds > 0) return;
    setEmail('admin@eotc-andnet.org');
    setPassword('AdminSecurePassword2026!');
    handleLoginSubmit('admin@eotc-andnet.org', 'AdminSecurePassword2026!');
  };

  const handleQuickTeacher = () => {
    if (rateLimitSeconds !== null && rateLimitSeconds > 0) return;
    setEmail('teacher@eotc-andnet.org');
    setPassword('TeacherPassword2026!');
    handleLoginSubmit('teacher@eotc-andnet.org', 'TeacherPassword2026!');
  };

  const handleQuickStudent = () => {
    if (rateLimitSeconds !== null && rateLimitSeconds > 0) return;
    setEmail('student@eotc-andnet.org');
    setPassword('StudentPassword2026!');
    handleLoginSubmit('student@eotc-andnet.org', 'StudentPassword2026!');
  };

  const toggleGradeSelection = (gradeId: string) => {
    if (!gradeId) return;
    setSelectedGradeIds((prev) =>
      prev.includes(gradeId) ? prev.filter((id) => id !== gradeId) : [...prev, gradeId]
    );
  };

  return (
    <div className="max-w-lg mx-auto my-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-md border border-stone-200 dark:border-slate-800 transition-colors">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center font-bold text-2xl mx-auto shadow">
          ✞
        </div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-white mt-3">
          {tab === 'login'
            ? lang === 'am' ? 'መግቢያ' : 'Sign In'
            : lang === 'am' ? 'የተማሪ አዲስ ምዝገባ' : 'Student Registration'}
        </h1>
        <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
          {lang === 'am' ? 'የሰንበት ትምህርት ቤት አንድነት መድረክ' : 'Sunday School Unity Learning Platform'}
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 dark:bg-slate-800 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setError(null);
          }}
          className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            tab === 'login'
              ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-sm'
              : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>{lang === 'am' ? 'ግባ' : 'Sign In'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('register');
            setError(null);
          }}
          className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            tab === 'register'
              ? 'bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-400 shadow-sm'
              : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>{lang === 'am' ? 'አዲስ ምዝገባ' : 'New Registration'}</span>
        </button>
      </div>

      {/* 15-Minute Inactivity Idle Auto-Logout Alert Banner */}
      {isIdleTimeout && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-1.5 text-amber-950 dark:text-amber-200">
          <div className="flex items-center space-x-2 font-bold text-amber-900 dark:text-amber-300">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {lang === 'am' ? 'የእንቅስቃሴ ማነስ ምክንያት ክፍለ-ጊዜው ተዘግቷል' : 'Session Expired Due to Inactivity'}
            </span>
          </div>
          <p className="text-amber-800 dark:text-amber-200 leading-relaxed pl-6">
            {lang === 'am'
              ? 'ለ15 ደቂቃዎች ምንም እንቅስቃሴ ባለማድረግዎ ምክንያት ደህንነትዎን ለመጠበቅ ከመለያዎ ወጥተዋል። እባክዎ እንደገና ይግቡ።'
              : 'You have been signed out after 15 minutes of inactivity for security. Please sign in again.'}
          </p>
        </div>
      )}

      {/* Session Expired Forced Logout Banner */}
      {isSessionExpired && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl text-xs space-y-1.5 text-red-950 dark:text-red-200">
          <div className="flex items-center space-x-2 font-bold text-red-900 dark:text-red-300">
            <Clock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>
              {lang === 'am' ? 'ክፍለ-ጊዜዎ አብቅቷል፤ እባክዎ እንደገና ይግቡ' : 'Session Expired — Please Sign In Again'}
            </span>
          </div>
          <p className="text-red-800 dark:text-red-200 leading-relaxed pl-6">
            {lang === 'am'
              ? 'የደህንነት ክፍለ-ጊዜዎ ስላለቀ መድረኩ ከመለያዎ አስወጥቶዎታል። እባክዎ ደህንነትዎን ለማረጋገጥ እንደገና ይግቡ።'
              : 'Your session has expired and you have been signed out. Please enter your credentials to continue.'}
          </p>
        </div>
      )}

      {currentUser && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-slate-850 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs space-y-2">
          <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === 'am' ? 'አሁን የገቡት መለያ:' : 'Currently Signed In:'}</span>
          </div>
          <div className="text-stone-700 dark:text-slate-300 pl-6">
            <span className="font-semibold text-stone-900 dark:text-white">{currentUser.fullName}</span> ({currentUser.email})
            <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300">
              {currentUser.role}
            </span>
          </div>
          <div className="pt-2 flex items-center space-x-2 pl-6">
            <button
              onClick={() => router.push(currentUser.role === 'ADMIN' ? '/admin' : currentUser.role === 'TEACHER' ? '/teacher' : '/')}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs transition cursor-pointer"
            >
              {lang === 'am' ? 'ወደ ገጽ ሂድ' : 'Continue'}
            </button>
            <button
              onClick={async () => {
                await api.logout();
                setCurrentUser(null);
              }}
              className="px-3 py-1 bg-stone-200 dark:bg-slate-700 hover:bg-stone-300 dark:hover:bg-slate-600 text-stone-700 dark:text-slate-200 font-semibold rounded text-xs transition cursor-pointer"
            >
              {lang === 'am' ? 'መለያ ቀይር' : 'Sign Out'}
            </button>
          </div>
        </div>
      )}

      {rateLimitSeconds !== null && rateLimitSeconds > 0 ? (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500/70 dark:border-amber-500/80 rounded-xl shadow-sm text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-amber-950 dark:text-amber-200">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-sm">
                {lang === 'am' ? 'የደህንነት ገደብ ተጥሏል' : 'Security Rate Limit Active'}
              </span>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-200/80 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-mono font-bold text-sm rounded-lg border border-amber-400 dark:border-amber-600">
              <Clock className="w-4 h-4 text-amber-700 dark:text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
              <span>{formatCountdown(rateLimitSeconds)}</span>
            </div>
          </div>
          <p className="text-amber-900 dark:text-amber-200 leading-relaxed pl-7">
            {lang === 'am'
              ? 'ከተፈቀደው በላይ የመግቢያ ሙከራ ተደርጓል፤ ያልተፈቀደ መዳረሻን ለመከላከል መድረኩ ለጊዜው ተቆልፏል። ቆጣሪው 0:00 ሲደርስ እንደገና መሞከር ይችላሉ።'
              : 'Too many attempts from this IP address. To protect account security, access is temporarily locked. You may retry when the countdown reaches 0:00.'}
          </p>
        </div>
      ) : error ? (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* LOGIN TAB */}
      {tab === 'login' ? (
        <div>
          {/* Quick 1-Click Role Switcher */}
          <div className="mb-6 space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400 text-center">
              {lang === 'am' ? 'ፈጣን የሙከራ መግቢያ' : 'Quick 1-Click Test Logins'}
            </span>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleQuickAdmin}
                disabled={loading || (rateLimitSeconds !== null && rateLimitSeconds > 0)}
                className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-300 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{lang === 'am' ? 'አስተዳዳሪ (Admin)' : 'Admin Test'}</span>
                <span className="text-[10px] text-stone-500 dark:text-slate-400 font-normal">admin@eotc-andnet.org</span>
              </button>

              <button
                type="button"
                onClick={handleQuickTeacher}
                disabled={loading || (rateLimitSeconds !== null && rateLimitSeconds > 0)}
                className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-900 dark:text-emerald-300 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Church className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'am' ? 'መምህር (Teacher)' : 'Teacher Test'}</span>
                <span className="text-[10px] text-stone-500 dark:text-slate-400 font-normal truncate max-w-full">teacher@eotc-andnet.org</span>
              </button>

              <button
                type="button"
                onClick={handleQuickStudent}
                disabled={loading || (rateLimitSeconds !== null && rateLimitSeconds > 0)}
                className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-900 dark:text-blue-300 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{lang === 'am' ? 'ተማሪ (Student)' : 'Student Test'}</span>
                <span className="text-[10px] text-stone-500 dark:text-slate-400 font-normal">student@eotc-andnet.org</span>
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-2 text-stone-400 dark:text-slate-500 font-semibold">
                {lang === 'am' ? 'ወይም በኢሜይል' : 'Or with Email'}
              </span>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLoginSubmit(email, password); }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'ኢሜይል' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="student@eotc-andnet.org"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'የይለፍ ቃል' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (rateLimitSeconds !== null && rateLimitSeconds > 0)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-lg text-sm shadow transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'am' ? 'በመግባት ላይ...' : 'Signing in...'}</span>
                </>
              ) : rateLimitSeconds !== null && rateLimitSeconds > 0 ? (
                <>
                  <Clock className="w-4 h-4 animate-pulse text-amber-400 dark:text-amber-900" />
                  <span>
                    {lang === 'am'
                      ? `እባክዎ ይጠብቁ (${formatCountdown(rateLimitSeconds)})`
                      : `Please wait (${formatCountdown(rateLimitSeconds)})`}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{lang === 'am' ? 'ግባ' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* REGISTER TAB */
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'ሙሉ ስም *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'ዮሐንስ ተስፋዬ' : 'Abebe Bikila'}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'ኢሜይል *' : 'Email Address *'}
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="student@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'የይለፍ ቃል (ቢያንስ 8 ፊደላት) *' : 'Password (min 8 chars) *'}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'ዕድሜ *' : 'Age *'}
              </label>
              <input
                type="number"
                min={3}
                max={120}
                required
                value={regAge}
                onChange={(e) => setRegAge(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'ምሳሌ፡ 16' : 'e.g. 16'}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'}
              </label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="0911223344"
              />
            </div>

            {/* Baptismal Name (Optional) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'የክርስትና ስም (አማራጭ)' : 'Baptismal Name (Optional)'}
              </label>
              <input
                type="text"
                value={regBaptismalName}
                onChange={(e) => setRegBaptismalName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'ኃይለ ማርያም' : 'Haile Maryam'}
              />
            </div>

            {/* Sunday School / Parish Church */}
            <div className="sm:col-span-2">
              <ParishCombobox
                value={regChurchParish}
                parishId={regParishId}
                onChange={(churchParish, parishId) => {
                  setRegChurchParish(churchParish);
                  setRegParishId(parishId || null);
                }}
                label={lang === 'am' ? 'ሰንበት ት/ቤት ወይም አጥቢያ ቤተክርስቲያን (አማራጭ)' : 'Sunday School (Optional)'}
                placeholder={lang === 'am' ? 'ደብር ወይም ሰንበት ትምህርት ቤት ይምረጡ ወይም ይፃፉ...' : 'Select or type Sunday School...'}
                helperText={lang === 'am' ? 'የሚማሩበትን ሰንበት ትምህርት ቤት ከዝርዝሩ ይምረጡ ወይም ካልተገኘ ይፃፉ' : 'Select from list or type custom name'}
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                {lang === 'am' ? 'የመኖሪያ አድራሻ (ከተማ / ክፍለ ከተማ)' : 'Residence Address (City / Sub-city)'}
              </label>
              <input
                type="text"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'አዲስ አበባ፣ ቂርቆስ' : 'Addis Ababa, Kirkos'}
              />
            </div>
          </div>

          {/* Grade Enrollment Selection */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-stone-800 dark:text-slate-200">
                {lang === 'am' ? 'የሚመዘገቡባቸው ክፍሎች (አንድ ወይም ከዚያ በላይ ይምረጡ) *' : 'Grades to Enroll In (Select one or more) *'}
              </label>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                {selectedGradeIds.length} {lang === 'am' ? 'ክፍል ተመርጧል' : 'selected'}
              </span>
            </div>

            {loadingGrades ? (
              <div className="p-4 text-center text-xs text-stone-400 dark:text-slate-500 bg-stone-50 dark:bg-slate-950/50 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-500" />
                <span>{lang === 'am' ? 'ክፍሎች በመጫን ላይ...' : 'Loading available grades...'}</span>
              </div>
            ) : availableGrades.length === 0 ? (
              <div className="p-3 text-xs text-stone-500 dark:text-slate-400 bg-stone-50 dark:bg-slate-950/50 rounded-lg border border-stone-200 dark:border-slate-800">
                {lang === 'am' ? 'በአሁኑ ሰዓት ክፍት ክፍሎች የሉም' : 'No published grades available'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-amber-50/50 dark:bg-slate-950/60 rounded-xl border border-amber-200 dark:border-slate-800">
                {availableGrades.map((g) => {
                  const gradeId = g.id || `grade-level-${g.level}`;
                  const isChecked = selectedGradeIds.includes(gradeId) || (g.id ? selectedGradeIds.includes(g.id) : false);
                  return (
                    <button
                      key={gradeId}
                      type="button"
                      onClick={() => toggleGradeSelection(gradeId)}
                      className={`w-full text-left select-none p-2 rounded-lg border text-xs font-semibold flex items-center space-x-2 transition cursor-pointer ${
                        isChecked
                          ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-300 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition ${
                          isChecked
                            ? 'bg-slate-900 border-slate-900 text-amber-400'
                            : 'border-stone-400 dark:border-slate-600 bg-white dark:bg-slate-950'
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
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
          </div>

          <button
            type="submit"
            disabled={loading || (rateLimitSeconds !== null && rateLimitSeconds > 0)}
            className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm shadow transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{lang === 'am' ? 'በመመዝገብ ላይ...' : 'Registering...'}</span>
              </>
            ) : rateLimitSeconds !== null && rateLimitSeconds > 0 ? (
              <>
                <Clock className="w-4 h-4 animate-pulse text-amber-200" />
                <span>
                  {lang === 'am'
                    ? `እባክዎ ይጠብቁ (${formatCountdown(rateLimitSeconds)})`
                    : `Please wait (${formatCountdown(rateLimitSeconds)})`}
                </span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{lang === 'am' ? 'ተመዝገብና መማር ጀምር' : 'Register & Start Learning'}</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-stone-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
