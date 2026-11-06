'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { WifiOff, ShieldAlert, RefreshCw, GraduationCap } from 'lucide-react';
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

      // The signed launch data is already in the URL, so signing in does not wait for Telegram's script
      // to download (offline it may never load); the script only sets up Telegram's UI once it arrives.
      const waPromise = loadTelegramWebApp();
      let initData = readLaunchInitData();
      let wa: TelegramWebApp | null = null;
      if (!initData) {
        wa = await waPromise;
        initData = wa?.initData || null;
      }
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
      const setUpWebApp = (app: TelegramWebApp) => {
        setWebApp(app);
        app.ready();
        app.expand();
        app.disableVerticalSwipes?.();
        // Follow Telegram's light/dark mode unless the student picked one in the app
        let storedTheme: string | null = null;
        try {
          storedTheme = localStorage.getItem('eotc_theme');
        } catch {
          /* storage unavailable */
        }
        if (!storedTheme && app.colorScheme !== theme) setTheme(app.colorScheme);
      };
      if (wa) setUpWebApp(wa);
      else
        void waPromise.then((app) => {
          if (!cancelled && app) setUpWebApp(app);
        });

      await api.init();
      const cachedUser = api.getUser();
      const sameStudent =
        !!api.getToken() && cachedUser?.telegramId != null && cachedUser.telegramId === launchUserId(initData);
      // A launch from a website "connect Telegram" link must wait for the result of linking
      const isLinkLaunch = !!new URLSearchParams(initData).get('start_param');

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

      // Returning student on this device: open the app at once with their saved session and renew it in
      // the background, instead of making them wait for the server (which may be waking up).
      const openedEarly = sameStudent && !isLinkLaunch;
      if (openedEarly) setStatus('ready');

      try {
        const result = await api.loginWithTelegram(initData);
        if (cancelled) return;
        try {
          sessionStorage.setItem(AUTHED_LAUNCH_KEY, launchKey(initData));
        } catch {
          /* storage unavailable */
        }
        if (!openedEarly) {
          setLaunch({ isNewUser: result.isNewUser, ...(result.linkStatus ? { linkStatus: result.linkStatus } : {}) });
          setStatus('ready');
        }
        const app = wa ?? (await waPromise);
        if (app && !cancelled) requestAnnouncementPermission(app, result.user);
        if (result.linkStatus) {
          const msg = LINK_MESSAGES[result.linkStatus];
          void uiAlert(langRef.current === 'am' ? msg.am : msg.en);
        }
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof ApiError ? err.code : undefined;
        if (code === 'TELEGRAM_STUDENTS_ONLY') setStatus('students-only');
        else if (code === 'ACCOUNT_INACTIVE') setStatus('inactive');
        else if (openedEarly) {
          // Already in the app with a valid saved session; an expired launch or a network hiccup can wait
          // until the session itself needs renewing.
        } else if (code === 'TELEGRAM_INIT_DATA_EXPIRED') setStatus('expired');
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

/**
 * Shown while a first-time (or switched) student is signed in. The free server sleeps when idle and can
 * take up to a minute to wake, so after a few seconds the screen says so rather than looking stuck.
 */
export function SignInSplash({ pick }: { pick: (am: string, en: string) => string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const step =
    elapsed < 4
      ? pick('በመግባት ላይ…', 'Signing you in…')
      : elapsed < 10
        ? pick('ከአገልጋዩ ጋር በመገናኘት ላይ…', 'Connecting to the server…')
        : pick('አገልጋዩ እየተነሣ ነው…', 'The server is waking up…');

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8 text-center bg-[#FCFBF7] dark:bg-[#020617]"
      data-tg-gate
      role="status"
      aria-live="polite"
    >
      <div className="relative w-28 h-28 flex items-center justify-center">
        <div className="eotc-glow absolute inset-0 rounded-full bg-amber-400/30 dark:bg-amber-500/20 blur-xl" aria-hidden />
        <div className="relative w-24 h-24 rounded-3xl bg-[#0C2340] shadow-xl shadow-amber-900/20 ring-1 ring-amber-500/30 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="w-full h-full" />
        </div>
      </div>

      <h1 className="mt-6 text-xl font-extrabold text-[#0C2340] dark:text-amber-50">ሰንበት ትምህርት ቤት</h1>
      <p className="mt-1 text-xs font-medium text-stone-500 dark:text-slate-400">
        {pick('የመማሪያ መድረክ', 'Sunday School learning')}
      </p>

      <div className="mt-8 w-48 h-1.5 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden" aria-hidden>
        <div className="eotc-indeterminate h-full w-2/5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600" />
      </div>
      <p key={step} className="eotc-rise mt-4 text-sm font-semibold text-stone-600 dark:text-slate-300">
        {step}
      </p>
      {elapsed >= 10 && (
        <p className="eotc-rise mt-2 max-w-xs text-xs leading-relaxed text-stone-500 dark:text-slate-400">
          {pick(
            'ለረጅም ጊዜ ጥቅም ላይ ካልዋለ በኋላ የመጀመሪያው መክፈቻ እስከ አንድ ደቂቃ ሊወስድ ይችላል። እባክዎ ይጠብቁ።',
            'After a quiet spell the first open can take up to a minute. Thanks for waiting.'
          )}
        </p>
      )}
    </div>
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

  if (status === 'loading') return <SignInSplash pick={pick} />;

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
