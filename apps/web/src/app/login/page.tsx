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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type { UserProfile } from '@eotc/shared';

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
  const isIdleTimeout = reason === 'idle_timeout';
  const isSessionExpired = reason === 'session_expired';
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
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);

  const [availableGrades, setAvailableGrades] = useState<AvailableGrade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

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
    setLoading(true);
    setError(null);

    try {
      const auth = await api.login(loginEmail, loginPass);
      if (auth.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push(redirectParam || '/');
      }
    } catch (err) {
      setError((err as Error).message || (lang === 'am' ? 'መግባት አልተቻለም' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        gradeIds: selectedGradeIds,
      });

      if (auth.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push(redirectParam || '/');
      }
    } catch (err) {
      setError((err as Error).message || (lang === 'am' ? 'ምዝገባ አልተሳካም' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmin = () => {
    setEmail('admin@eotc-andnet.org');
    setPassword('AdminSecurePassword2026!');
    handleLoginSubmit('admin@eotc-andnet.org', 'AdminSecurePassword2026!');
  };

  const handleQuickStudent = () => {
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
    <div className="max-w-lg mx-auto my-8 bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-stone-200">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center font-bold text-2xl mx-auto shadow">
          ✞
        </div>
        <h1 className="text-xl font-bold text-stone-900 mt-3">
          {tab === 'login'
            ? lang === 'am' ? 'መግቢያ' : 'Sign In'
            : lang === 'am' ? 'የተማሪ አዲስ ምዝገባ' : 'Student Registration'}
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          {lang === 'am' ? 'የሰንበት ትምህርት ቤት አንድነት መድረክ' : 'Sunday School Unity Learning Platform'}
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setError(null);
          }}
          className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
            tab === 'login'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800'
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
          className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
            tab === 'register'
              ? 'bg-white text-amber-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>{lang === 'am' ? 'አዲስ ምዝገባ' : 'New Registration'}</span>
        </button>
      </div>

      {/* 15-Minute Inactivity Idle Auto-Logout Alert Banner */}
      {isIdleTimeout && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5 text-amber-950">
          <div className="flex items-center space-x-2 font-bold text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === 'am' ? 'የእንቅስቃሴ ማነስ ምክንያት ክፍለ-ጊዜው ተዘግቷል' : 'Session Expired Due to Inactivity'}
            </span>
          </div>
          <p className="text-amber-800 leading-relaxed pl-6">
            {lang === 'am'
              ? 'ለ15 ደቂቃዎች ምንም እንቅስቃሴ ባለማድረግዎ ምክንያት ደህንነትዎን ለመጠበቅ ከመለያዎ ወጥተዋል። እባክዎ እንደገና ይግቡ።'
              : 'You have been signed out after 15 minutes of inactivity for security. Please sign in again.'}
          </p>
        </div>
      )}

      {/* Session Expired Forced Logout Banner */}
      {isSessionExpired && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-xl text-xs space-y-1.5 text-red-950">
          <div className="flex items-center space-x-2 font-bold text-red-900">
            <Clock className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              {lang === 'am' ? 'ክፍለ-ጊዜዎ አብቅቷል፤ እባክዎ እንደገና ይግቡ' : 'Session Expired — Please Sign In Again'}
            </span>
          </div>
          <p className="text-red-800 leading-relaxed pl-6">
            {lang === 'am'
              ? 'የደህንነት ክፍለ-ጊዜዎ ስላለቀ መድረኩ ከመለያዎ አስወጥቶዎታል። እባክዎ ደህንነትዎን ለማረጋገጥ እንደገና ይግቡ።'
              : 'Your session has expired and you have been signed out. Please enter your credentials to continue.'}
          </p>
        </div>
      )}

      {currentUser && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
          <div className="flex items-center space-x-2 text-amber-900 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'am' ? 'አሁን የገቡት መለያ:' : 'Currently Signed In:'}</span>
          </div>
          <div className="text-stone-700 pl-6">
            <span className="font-semibold text-stone-900">{currentUser.fullName}</span> ({currentUser.email})
            <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
              {currentUser.role}
            </span>
          </div>
          <div className="pt-2 flex items-center space-x-2 pl-6">
            <button
              onClick={() => router.push(currentUser.role === 'ADMIN' ? '/admin' : '/')}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs transition"
            >
              {lang === 'am' ? 'ወደ ገጽ ሂድ' : 'Continue'}
            </button>
            <button
              onClick={async () => {
                await api.logout();
                setCurrentUser(null);
              }}
              className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold rounded text-xs transition"
            >
              {lang === 'am' ? 'መለያ ቀይር' : 'Sign Out'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* LOGIN TAB */}
      {tab === 'login' ? (
        <div>
          {/* Quick 1-Click Role Switcher */}
          <div className="mb-6 space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 text-center">
              {lang === 'am' ? 'ፈጣን የሙከራ መግቢያ' : 'Quick 1-Click Test Logins'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickAdmin}
                disabled={loading}
                className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-900 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1"
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>{lang === 'am' ? 'አስተዳዳሪ (Admin)' : 'Admin Test'}</span>
                <span className="text-[10px] text-stone-500 font-normal">admin@eotc-andnet.org</span>
              </button>

              <button
                type="button"
                onClick={handleQuickStudent}
                disabled={loading}
                className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-900 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1"
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>{lang === 'am' ? 'ተማሪ (Student)' : 'Student Test'}</span>
                <span className="text-[10px] text-stone-500 font-normal">student@eotc-andnet.org</span>
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-stone-400 font-semibold">
                {lang === 'am' ? 'ወይም በኢሜይል' : 'Or with Email'}
              </span>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLoginSubmit(email, password); }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'ኢሜይል' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="student@eotc-andnet.org"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'የይለፍ ቃል' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'am' ? 'በመግባት ላይ...' : 'Signing in...'}</span>
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
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'ሙሉ ስም *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'ዮሐንስ ተስፋዬ' : 'Abebe Bikila'}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'ኢሜይል *' : 'Email Address *'}
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="student@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'የይለፍ ቃል (ቢያንስ 8 ፊደላት) *' : 'Password (min 8 chars) *'}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'ዕድሜ *' : 'Age *'}
              </label>
              <input
                type="number"
                min={3}
                max={120}
                required
                value={regAge}
                onChange={(e) => setRegAge(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'ምሳሌ፡ 16' : 'e.g. 16'}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'}
              </label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="0911223344"
              />
            </div>

            {/* Baptismal Name (Optional) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'የክርስትና ስም (አማራጭ)' : 'Baptismal Name (Optional)'}
              </label>
              <input
                type="text"
                value={regBaptismalName}
                onChange={(e) => setRegBaptismalName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'ኃይለ ማርያም' : 'Haile Maryam'}
              />
            </div>

            {/* Sunday School / Parish Church (Optional) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'ሰንበት ት/ቤት ወይም አጥቢያ ቤተክርስቲያን (አማራጭ)' : 'Sunday School / Parish Church (Optional)'}
              </label>
              <input
                type="text"
                value={regChurchParish}
                onChange={(e) => setRegChurchParish(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'ደብረ ሰላም መድኃኔዓለም' : 'Debre Selam Medhanealem'}
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {lang === 'am' ? 'የመኖሪያ አድራሻ (ከተማ / ክፍለ ከተማ)' : 'Residence Address (City / Sub-city)'}
              </label>
              <input
                type="text"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'am' ? 'አዲስ አበባ፣ ቂርቆስ' : 'Addis Ababa, Kirkos'}
              />
            </div>
          </div>

          {/* Grade Enrollment Selection */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-stone-800">
                {lang === 'am' ? 'የሚመዘገቡባቸው ክፍሎች (አንድ ወይም ከዚያ በላይ ይምረጡ) *' : 'Grades to Enroll In (Select one or more) *'}
              </label>
              <span className="text-[11px] text-amber-700 font-medium">
                {selectedGradeIds.length} {lang === 'am' ? 'ክፍል ተመርጧል' : 'selected'}
              </span>
            </div>

            {loadingGrades ? (
              <div className="p-4 text-center text-xs text-stone-400 bg-stone-50 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-500" />
                <span>{lang === 'am' ? 'ክፍሎች በመጫን ላይ...' : 'Loading available grades...'}</span>
              </div>
            ) : availableGrades.length === 0 ? (
              <div className="p-3 text-xs text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
                {lang === 'am' ? 'በአሁኑ ሰዓት ክፍት ክፍሎች የሉም' : 'No published grades available'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                {availableGrades.map((g) => {
                  const gradeId = g.id || `grade-level-${g.level}`;
                  const isChecked = selectedGradeIds.includes(gradeId) || (g.id ? selectedGradeIds.includes(g.id) : false);
                  return (
                    <button
                      key={gradeId}
                      type="button"
                      onClick={() => toggleGradeSelection(gradeId)}
                      className={`w-full text-left select-none p-2 rounded-lg border text-xs font-semibold flex items-center space-x-2 transition ${
                        isChecked
                          ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-amber-400'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition ${
                          isChecked
                            ? 'bg-slate-900 border-slate-900 text-amber-400'
                            : 'border-stone-400 bg-white'
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
            disabled={loading}
            className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{lang === 'am' ? 'በመመዝገብ ላይ...' : 'Registering...'}</span>
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
