'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { friendlyAuthError } from '@/lib/auth-errors';
import { useLanguage } from '@/lib/language-context';

export default function ForgotPasswordPage() {
  const { lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err, lang, 'Could not send the request. Check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-md border border-stone-200 dark:border-slate-800">
      <div className="mb-6 space-y-2 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
          <Mail className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-extrabold text-stone-900 dark:text-white">
          {lang === 'am' ? 'የይለፍ ቃል ማስመለስ' : 'Reset your password'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {lang === 'am'
            ? 'የመለያዎን ኢሜይል ያስገቡ፤ የይለፍ ቃል መቀየሪያ አገናኝ እንልክልዎታለን።'
            : 'Enter your account email and we will send you a link to choose a new password.'}
        </p>
      </div>

      {sent ? (
        <div role="status" className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {lang === 'am'
                ? 'ከዚህ ኢሜይል ጋር የተያያዘ መለያ ካለ፣ የመቀየሪያ አገናኝ ተልኳል። የገቢ መልእክት (እና የአይፈለጌ መልእክት) አቃፊዎን ይመልከቱ። አገናኙ ለተወሰነ ጊዜ ብቻ ይሰራል።'
                : 'If an account exists for this email, a reset link is on its way. Check your inbox (and spam folder). The link works for a limited time and only once.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="w-full text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
          >
            {lang === 'am' ? 'ሌላ ኢሜይል ሞክር' : 'Use a different email'}
          </button>
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
            <label htmlFor="fp-email" className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
              {lang === 'am' ? 'ኢሜይል' : 'Email Address'}
            </label>
            <input
              id="fp-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-lg text-sm shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {lang === 'am' ? 'የመቀየሪያ አገናኝ ላክ' : 'Send reset link'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-700 dark:text-slate-300 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {lang === 'am' ? 'ወደ መግቢያ ተመለስ' : 'Back to sign in'}
        </Link>
      </div>
    </div>
  );
}
