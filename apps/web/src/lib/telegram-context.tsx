'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, WifiOff, ShieldAlert, RefreshCw, GraduationCap } from 'lucide-react';
import type { TelegramLinkStatus, UserProfile } from '@eotc/shared';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';
import {
  TELEGRAM_SESSION_KEY,
  isTelegramLaunch,
  loadTelegramWebApp,
  readLaunchInitData,
  launchUserId,
  uiAlert,
  type TelegramWebApp,
} from '@/lib/telegram';

/**
 * - web: an ordinary browser, nothing Telegram-specific happens
 * - loading: signing in from the Telegram launch data
 * - ready: signed in (online, or offline with this student's cached session)
 * - the rest are dead ends explained on screen
 */
export type TelegramStatus = 'web' | 'loading' | 'ready' | 'offline' | 'students-only' | 'inactive' | 'expired' | 'error';

interface TelegramContextValue {
  isTelegram: boolean;
  status: TelegramStatus;
  webApp: TelegramWebApp | null;
  /** Set after a sign-in made during this page load */
  launch: { isNewUser: boolean; linkStatus?: TelegramLinkStatus } | null;
}

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  status: 'web',
  webApp: null,
  launch: null,
});

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}

// Remembers which launch already signed in, so in-app reloads do not sign in again
const AUTHED_LAUNCH_KEY = 'eotc_tg_authed_launch';
// Telegram's "allow messages from this bot" prompt is shown at most once per device
const WRITE_ACCESS_ASKED_KEY = 'eotc_tg_write_access_asked';

/** Asks once for permission to send announcements as bot messages, unless already granted or turned off. */
function requestAnnouncementPermission(wa: TelegramWebApp, user: UserProfile): void {
  if (!wa.requestWriteAccess || !wa.isVersionAtLeast('6.9')) return;
  if (wa.initDataUnsafe.user?.allows_write_to_pm || user.telegramNotify === false) return;
  try {
    if (localStorage.getItem(WRITE_ACCESS_ASKED_KEY)) return;
    localStorage.setItem(WRITE_ACCESS_ASKED_KEY, '1');
  } catch {
    return;
  }
  wa.requestWriteAccess((granted) => {
    if (granted) void api.setTelegramNotifications(true).catch(() => undefined);
  });
}

function launchKey(initData: string): string {
  return new URLSearchParams(initData).get('hash') ?? '';
}

const LINK_MESSAGES: Record<TelegramLinkStatus, { am: string; en: string }> = {
  LINKED: { am: 'ቴሌግራም ከመለያዎ ጋር ተገናኝቷል።', en: 'Telegram is now connected to your account.' },
  TELEGRAM_LINK_INVALID: {
    am: 'የማገናኛ ሊንኩ ጊዜው አልፏል ወይም ተጠቅመውበታል። ከድረ-ገጹ መገለጫ ገጽ አዲስ ሊንክ ይፍጠሩ።',
    en: 'This link has expired or was already used. Create a new one from your profile on the website.',
  },
  TELEGRAM_ALREADY_LINKED: {
    am: 'ይህ መለያ ከሌላ የቴሌግራም መለያ ጋር ተገናኝቷል።',
    en: 'That account is already connected to a different Telegram account.',
  },
  TELEGRAM_IN_USE: {
    am: 'ይህ የቴሌግራም መለያ ከሌላ መለያ ጋር ተገናኝቷል።',
    en: 'This Telegram account is already connected to another account.',
  },
};

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [status, setStatus] = useState<TelegramStatus>('web');
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [launch, setLaunch] = useState<TelegramContextValue['launch']>(null);
  const [attempt, setAttempt] = useState(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  // Sign in on every launch
  useEffect(() => {
    if (!isTelegramLaunch()) {
      document.documentElement.removeAttribute('data-tg');
      return;
    }
    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        sessionStorage.setItem(TELEGRAM_SESSION_KEY, '1');
      } catch {
        /* storage unavailable */
      }

      // Offline the Telegram script may not load; the launch data in the URL is still enough to decide
      const wa = await loadTelegramWebApp();
      const initData = wa?.initData || readLaunchInitData();
      if (cancelled) return;
      if (!initData) {
        // Not really inside Telegram (e.g. a copied /tg link opened in a browser)
        try {
          sessionStorage.removeItem(TELEGRAM_SESSION_KEY);
        } catch {
          /* storage unavailable */
        }
        document.documentElement.removeAttribute('data-tg');
        setStatus('web');
        return;
      }

      document.documentElement.setAttribute('data-tg', '');
      if (wa) {
        setWebApp(wa);
        wa.ready();
        wa.expand();
        wa.disableVerticalSwipes?.();
        // Follow Telegram's light/dark mode unless the student picked one in the app
        let storedTheme: string | null = null;
        try {
          storedTheme = localStorage.getItem('eotc_theme');
        } catch {
          /* storage unavailable */
        }
        if (!storedTheme && wa.colorScheme !== theme) setTheme(wa.colorScheme);
      }

      await api.init();
      const cachedUser = api.getUser();
      const sameStudent = cachedUser?.telegramId != null && cachedUser.telegramId === launchUserId(initData);

      let alreadyAuthed = false;
      try {
        alreadyAuthed = sessionStorage.getItem(AUTHED_LAUNCH_KEY) === launchKey(initData);
      } catch {
        /* storage unavailable */
      }
      if (alreadyAuthed && sameStudent) {
        if (!cancelled) setStatus('ready');
        return;
      }

      try {
        const result = await api.loginWithTelegram(initData);
        if (cancelled) return;
        try {
          sessionStorage.setItem(AUTHED_LAUNCH_KEY, launchKey(initData));
        } catch {
          /* storage unavailable */
        }
        setLaunch({ isNewUser: result.isNewUser, ...(result.linkStatus ? { linkStatus: result.linkStatus } : {}) });
        setStatus('ready');
        if (wa) requestAnnouncementPermission(wa, result.user);
        if (result.linkStatus) {
          const msg = LINK_MESSAGES[result.linkStatus];
          void uiAlert(langRef.current === 'am' ? msg.am : msg.en);
        }
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof ApiError ? err.code : undefined;
        if (code === 'TELEGRAM_STUDENTS_ONLY') setStatus('students-only');
        else if (code === 'ACCOUNT_INACTIVE') setStatus('inactive');
        else if (code === 'TELEGRAM_INIT_DATA_EXPIRED') setStatus('expired');
        else if (code === 'NETWORK_ERROR' || code === 'SERVER_UNAVAILABLE' || !navigator.onLine) {
          // Offline: carry on with this student's cached session, never with someone else's
          setStatus(sameStudent ? 'ready' : 'offline');
        } else setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Keep Telegram's header and background in the app's colours
  useEffect(() => {
    if (!webApp) return;
    try {
      webApp.setHeaderColor('#0C2340');
      webApp.setBackgroundColor(theme === 'dark' ? '#020617' : '#FCFBF7');
    } catch {
      /* older Telegram clients */
    }
  }, [webApp, theme]);

  // Telegram's Back button replaces the browser's, which Mini Apps do not have
  useEffect(() => {
    if (!webApp || status !== 'ready') return;
    const isRoot = pathname === '/' || pathname === '/tg';
    if (isRoot) {
      webApp.BackButton.hide();
      return;
    }
    const goBack = () => router.back();
    webApp.BackButton.onClick(goBack);
    webApp.BackButton.show();
    return () => webApp.BackButton.offClick(goBack);
  }, [webApp, status, pathname, router]);

  // Links that leave the app open in Telegram's browser instead of replacing the Mini App
  useEffect(() => {
    if (!webApp) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) return;
      e.preventDefault();
      if (url.hostname === 't.me') webApp.openTelegramLink(url.href);
      else webApp.openLink(url.href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [webApp]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const isTelegram = status !== 'web';

  return (
    <TelegramContext.Provider value={{ isTelegram, status, webApp, launch }}>
      {status === 'web' || status === 'ready' ? children : <TelegramGate status={status} onRetry={retry} webApp={webApp} />}
    </TelegramContext.Provider>
  );
}

function TelegramGate({
  status,
  onRetry,
  webApp,
}: {
  status: Exclude<TelegramStatus, 'web' | 'ready'>;
  onRetry: () => void;
  webApp: TelegramWebApp | null;
}) {
  const { lang } = useLanguage();
  const pick = (am: string, en: string) => (lang === 'am' ? am : en);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-stone-500 dark:text-slate-400" data-tg-gate>
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <p className="text-sm font-semibold">{pick('በመግባት ላይ...', 'Signing you in...')}</p>
      </div>
    );
  }

  const content: Record<typeof status, { icon: React.ReactNode; title: string; body: string; retry: boolean }> = {
    offline: {
      icon: <WifiOff className="w-10 h-10 text-amber-600" />,
      title: pick('ኢንተርኔት የለም', 'No internet connection'),
      body: pick(
        'ለመጀመሪያ ጊዜ ለመግባት ኢንተርኔት ያስፈልጋል። ከተገናኙ በኋላ እንደገና ይሞክሩ።',
        'You need the internet the first time you sign in. Connect and try again.'
      ),
      retry: true,
    },
    'students-only': {
      icon: <GraduationCap className="w-10 h-10 text-amber-600" />,
      title: pick('ለተማሪዎች ብቻ', 'For students only'),
      body: pick(
        'የቴሌግራም መተግበሪያው ለተማሪዎች ብቻ ነው። መምህራን እና አስተዳዳሪዎች እባክዎ ድረ-ገጹን ይጠቀሙ።',
        'The Telegram app is for students. Teachers and administrators, please use the website.'
      ),
      retry: false,
    },
    inactive: {
      icon: <ShieldAlert className="w-10 h-10 text-red-600" />,
      title: pick('መለያው ታግዷል', 'Account deactivated'),
      body: pick('መለያዎ ተዘግቷል። እባክዎ አስተዳዳሪዎን ያነጋግሩ።', 'Your account has been deactivated. Please contact an administrator.'),
      retry: false,
    },
    expired: {
      icon: <RefreshCw className="w-10 h-10 text-amber-600" />,
      title: pick('እንደገና ይክፈቱ', 'Please reopen the app'),
      body: pick(
        'መተግበሪያው ለረጅም ጊዜ ክፍት ነበር። ዘግተው እንደገና ይክፈቱት።',
        'The app has been open for a long time. Close it and open it again from the bot.'
      ),
      retry: false,
    },
    error: {
      icon: <ShieldAlert className="w-10 h-10 text-red-600" />,
      title: pick('መግባት አልተቻለም', 'Could not sign you in'),
      body: pick('ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።', 'Something went wrong. Please try again.'),
      retry: true,
    },
  };
  const c = content[status];

  return (
    <div className="max-w-sm mx-auto flex flex-col items-center text-center gap-3 py-20 px-4" data-tg-gate>
      {c.icon}
      <h1 className="text-lg font-bold">{c.title}</h1>
      <p className="text-sm text-stone-600 dark:text-slate-400">{c.body}</p>
      {c.retry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold"
        >
          {pick('እንደገና ሞክር', 'Try again')}
        </button>
      ) : (
        webApp && (
          <button
            type="button"
            onClick={() => webApp.close()}
            className="mt-2 px-5 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 text-sm font-bold"
          >
            {pick('ዝጋ', 'Close')}
          </button>
        )
      )}
    </div>
  );
}
