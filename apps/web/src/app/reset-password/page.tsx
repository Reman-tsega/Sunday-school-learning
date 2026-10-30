'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

const inputClass =
  'w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500';

function ResetPasswordContent() {
  const { lang } = useLanguage();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(lang === 'am' ? 'የይለፍ ቃል ቢያንስ 8 ቁምፊዎች መሆን አለበት።' : 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError(lang === 'am' ? 'የይለፍ ቃሎቹ አይመሳሰሉም።' : 'The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_RESET_TOKEN') {
        setLinkInvalid(true);
      } else if (err instanceof ApiError) {
        setError(lang === 'am' && err.amharicMessage ? err.amharicMessage : err.message);
      } else {
        setError(lang === 'am' ? 'የይለፍ ቃል መቀየር አልተቻለም። ግንኙነትዎን ያረጋግጡ።' : 'Could not reset the password. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const invalid = !token || linkInvalid;

  return (
    <div className="max-w-md mx-auto my-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-md border border-stone-200 dark:border-slate-800">
      <div className="mb-6 space-y-2 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
          <KeyRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-extrabold text-stone-900 dark:text-white">
          {lang === 'am' ? 'አዲስ የይለፍ ቃል ይምረጡ' : 'Choose a new password'}
        </h1>
      </div>

      {done ? (
        <div role="status" className="space-y-4 text-center">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-left text-sm text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {lang === 'am'
                ? 'የይለፍ ቃልዎ ተቀይሯል። በሁሉም መሣሪያዎች ላይ ወጥተዋል፤ እባክዎ በአዲሱ የይለፍ ቃል ይግቡ።'
                : 'Your password has been changed and you were signed out on all devices. Please sign in with the new password.'}
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-lg text-sm shadow transition"
          >
            {lang === 'am' ? 'ግባ' : 'Sign in'}
          </Link>
        </div>
      ) : invalid ? (
        <div role="alert" className="space-y-4 text-center">
          <div className="flex items-start gap-2 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-left text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {lang === 'am'
                ? 'ይህ አገናኝ ልክ አይደለም ወይም ጊዜው አልፎበታል። እባክዎ አዲስ አገናኝ ይጠይቁ።'
                : 'This reset link is invalid or has expired. Please request a new one.'}
            </p>
          </div>
          <Link href="/forgot-password" className="text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline">
            {lang === 'am' ? 'አዲስ አገናኝ ጠይቅ' : 'Request a new link'}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
          <div>
            <label htmlFor="rp-password" className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
              {lang === 'am' ? 'አዲስ የይለፍ ቃል' : 'New password'}
            </label>
            <input
              id="rp-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
            <p className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">
              {lang === 'am' ? 'ቢያንስ 8 ቁምፊዎች' : 'At least 8 characters'}
            </p>
          </div>
          <div>
            <label htmlFor="rp-confirm" className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
              {lang === 'am' ? 'የይለፍ ቃሉን ያረጋግጡ' : 'Confirm password'}
            </label>
            <input
              id="rp-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-lg text-sm shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {lang === 'am' ? 'የይለፍ ቃል ቀይር' : 'Reset password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
