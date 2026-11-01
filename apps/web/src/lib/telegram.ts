/**
 * Telegram Mini App helpers. The Telegram script is only loaded when the page was opened inside Telegram,
 * so ordinary website visitors never download it.
 */

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface BottomButton {
  setText(text: string): BottomButton;
  show(): BottomButton;
  hide(): BottomButton;
  enable(): BottomButton;
  disable(): BottomButton;
  showProgress(leaveActive?: boolean): BottomButton;
  hideProgress(): BottomButton;
  onClick(cb: () => void): BottomButton;
  offClick(cb: () => void): BottomButton;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramWebAppUser; start_param?: string };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  disableVerticalSwipes?(): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (ok: boolean) => void): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  MainButton: BottomButton;
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js';
// Remembers for this tab that it is a Mini App, since Telegram only puts the launch data in the first URL
export const TELEGRAM_SESSION_KEY = 'eotc_tg';

/** True when this tab was opened as a Telegram Mini App (works before the Telegram script has loaded). */
export function isTelegramLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.Telegram?.WebApp?.initData) return true;
  if (/[#&?]tgWebAppData=/.test(window.location.hash + window.location.search)) return true;
  try {
    return sessionStorage.getItem(TELEGRAM_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

let loading: Promise<TelegramWebApp | null> | null = null;

/** Loads telegram-web-app.js once and resolves to the WebApp object, or null outside Telegram. */
export function loadTelegramWebApp(): Promise<TelegramWebApp | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.Telegram?.WebApp?.initData) return Promise.resolve(window.Telegram.WebApp);
  if (!loading) {
    loading = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        const webApp = window.Telegram?.WebApp;
        resolve(webApp?.initData ? webApp : null);
      };
      script.onerror = () => {
        loading = null;
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

/** The WebApp object once loaded inside Telegram, otherwise null. */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const webApp = window.Telegram?.WebApp;
  return webApp?.initData ? webApp : null;
}

/** Native Telegram alert inside the Mini App, the browser alert elsewhere. */
export function uiAlert(message: string): Promise<void> {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    window.alert(message);
    return Promise.resolve();
  }
  return new Promise((resolve) => webApp.showAlert(message, () => resolve()));
}

/** Native Telegram confirm inside the Mini App, the browser confirm elsewhere. */
export function uiConfirm(message: string): Promise<boolean> {
  const webApp = getTelegramWebApp();
  if (!webApp) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => webApp.showConfirm(message, (ok) => resolve(ok)));
}

export function haptic(kind: 'success' | 'error' | 'light'): void {
  const feedback = getTelegramWebApp()?.HapticFeedback;
  if (!feedback) return;
  if (kind === 'light') feedback.impactOccurred('light');
  else feedback.notificationOccurred(kind);
}

const INIT_DATA_KEY = 'eotc_tg_init';

/**
 * The signed launch data straight from the URL Telegram opened (kept for this tab only), for when
 * telegram-web-app.js cannot load, e.g. when the app is opened offline.
 */
export function readLaunchInitData(): string | null {
  if (typeof window === 'undefined') return null;
  const fromUrl = new URLSearchParams(window.location.hash.slice(1)).get('tgWebAppData');
  try {
    if (fromUrl) sessionStorage.setItem(INIT_DATA_KEY, fromUrl);
    return fromUrl || sessionStorage.getItem(INIT_DATA_KEY);
  } catch {
    return fromUrl;
  }
}

/** Telegram user id inside launch data. Unverified: only for choosing which cached session to use offline. */
export function launchUserId(initData: string): string | null {
  try {
    const user = JSON.parse(new URLSearchParams(initData).get('user') ?? 'null');
    return user?.id != null ? String(user.id) : null;
  } catch {
    return null;
  }
}
