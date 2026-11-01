'use client';

import React, { useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import type { UserProfile } from '@eotc/shared';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

/** Lets a student with a linked Telegram account choose whether announcements also arrive as bot messages. */
export default function TelegramAnnouncementsSwitch({ user, onChange }: { user: UserProfile; onChange: (u: UserProfile) => void }) {
  const { lang } = useLanguage();
  const pick = (am: string, en: string) => (lang === 'am' ? am : en);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = user.telegramNotify !== false;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      onChange(await api.setTelegramNotifications(!enabled));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <BellRing className="w-4 h-4 text-sky-500" />
          <span>{pick('ማስታወቂያዎች በቴሌግራም', 'Announcements in Telegram')}</span>
        </h3>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          disabled={busy}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
            enabled ? 'bg-sky-500' : 'bg-stone-300 dark:bg-slate-700'
          }`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          {busy && <Loader2 className="absolute inset-0 m-auto w-3.5 h-3.5 animate-spin text-white" />}
        </button>
      </div>
      <p className="text-xs text-stone-600 dark:text-slate-400">
        {enabled
          ? pick(
              'ከሰንበት ትምህርት ቤቱ የሚላኩ ማስታወቂያዎች በቴሌግራም ቦቱ በኩል ይደርሱዎታል።',
              'Announcements from your Sunday School also arrive as messages from the Telegram bot.'
            )
          : pick(
              'ማስታወቂያዎች በመተግበሪያው ውስጥ ብቻ ይታያሉ።',
              'Announcements only appear inside the app.'
            )}
      </p>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
