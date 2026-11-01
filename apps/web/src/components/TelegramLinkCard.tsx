'use client';

import React, { useState } from 'react';
import { Send, Loader2, CheckCircle, Unlink } from 'lucide-react';
import type { UserProfile } from '@eotc/shared';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { uiConfirm } from '@/lib/telegram';

/**
 * Website-only card that connects a student's account to the Telegram Mini App. It opens a one-time
 * t.me link; the Mini App then signs in to this account and merges anything done in Telegram before.
 */
export default function TelegramLinkCard({ user, onChange }: { user: UserProfile; onChange: () => void }) {
  const { lang } = useLanguage();
  const pick = (am: string, en: string) => (lang === 'am' ? am : en);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const { deepLink: link } = await api.createTelegramLinkCode();
      setDeepLink(link);
      window.open(link, '_blank', 'noopener');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    const ok = await uiConfirm(
      pick('ቴሌግራምን ከመለያዎ ማላቀቅ ይፈልጋሉ?', 'Disconnect Telegram from your account?')
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api.unlinkTelegram();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 space-y-3">
      <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center space-x-2">
        <Send className="w-4 h-4 text-sky-500" />
        <span>{pick('ቴሌግራም', 'Telegram')}</span>
      </h3>

      {user.telegramId ? (
        <>
          <p className="text-xs text-stone-600 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {pick('ተገናኝቷል', 'Connected')}
              {user.telegramUsername ? ` (@${user.telegramUsername})` : ''}
            </span>
          </p>
          {user.hasPassword !== false && (
            <button
              type="button"
              onClick={disconnect}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
              <span>{pick('አላቅቅ', 'Disconnect')}</span>
            </button>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-stone-600 dark:text-slate-400">
            {pick(
              'በቴሌግራም መተግበሪያው ያለ የይለፍ ቃል ይግቡ። ከዚህ በፊት በቴሌግራም የተማሩት ሁሉ ወደዚህ መለያ ይዛወራል።',
              'Sign in to the Telegram app without a password. Anything you already did in the Telegram app moves into this account.'
            )}
          </p>
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{pick('ቴሌግራምን አገናኝ', 'Connect Telegram')}</span>
          </button>
          {deepLink && (
            <p className="text-[11px] text-stone-500 dark:text-slate-400">
              {pick('ቴሌግራም ካልተከፈተ ', "If Telegram didn't open, ")}
              <a href={deepLink} target="_blank" rel="noreferrer" className="font-bold text-sky-600 hover:underline">
                {pick('እዚህ ይጫኑ', 'tap here')}
              </a>
              {pick(' (ሊንኩ ለ15 ደቂቃ ይሠራል)።', ' (the link works for 15 minutes).')}
            </p>
          )}
        </>
      )}

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
