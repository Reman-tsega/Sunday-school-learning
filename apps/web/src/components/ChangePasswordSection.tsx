'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, KeyRound, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

const inputClass =
  'w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500';

/** Change password for the signed-in user: current password, new password and confirmation. */
export default function ChangePasswordSection() {
  const { lang } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const t = (en: string, am: string) => (lang === 'am' ? am : en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: t('New password must be at least 8 characters.', 'አዲሱ የይለፍ ቃል ቢያንስ 8 ቁምፊዎች መሆን አለበት።') });
      return;
    }
    if (newPassword !== confirm) {
      setMessage({ type: 'error', text: t('The new password and its confirmation do not match.', 'አዲሱ የይለፍ ቃልና ማረጋገጫው አይመሳሰሉም።') });
      return;
    }
    if (newPassword === currentPassword) {
      setMessage({ type: 'error', text: t('The new password must be different from the current one.', 'አዲሱ የይለፍ ቃል ከአሁኑ የተለየ መሆን አለበት።') });
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setMessage({ type: 'success', text: t('Password changed. Your other devices were signed out.', 'የይለፍ ቃልዎ ተቀይሯል። በሌሎች መሣሪያዎች ላይ ወጥተዋል።') });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CURRENT_PASSWORD') {
        setMessage({ type: 'error', text: t('The current password is incorrect.', 'የአሁኑ የይለፍ ቃል ትክክል አይደለም።') });
      } else if (err instanceof ApiError) {
        setMessage({ type: 'error', text: lang === 'am' && err.amharicMessage ? err.amharicMessage : err.message });
      } else {
        setMessage({ type: 'error', text: t('Could not change the password. Check your connection.', 'የይለፍ ቃል መቀየር አልተቻለም። ግንኙነትዎን ያረጋግጡ።') });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="change-password-title" className="space-y-4 border-t border-stone-100 dark:border-slate-800 pt-5">
      <h2 id="change-password-title" className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
        <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span>{t('Change Password', 'የይለፍ ቃል ቀይር')}</span>
      </h2>

      {message ? (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
              : 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{message.text}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cp-current" className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
            {t('Current password', 'የአሁኑ የይለፍ ቃል')}
          </label>
          <input
            id="cp-current"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cp-new" className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
              {t('New password', 'አዲስ የይለፍ ቃል')}
            </label>
            <input
              id="cp-new"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">{t('At least 8 characters', 'ቢያንስ 8 ቁምፊዎች')}</p>
          </div>
          <div>
            <label htmlFor="cp-confirm" className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
              {t('Confirm new password', 'አዲሱን የይለፍ ቃል ያረጋግጡ')}
            </label>
            <input
              id="cp-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-lg text-sm shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
            {t('Change password', 'የይለፍ ቃል ቀይር')}
          </button>
        </div>
      </form>
    </section>
  );
}
