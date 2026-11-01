import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/tg',
}));

import { api } from '../src/lib/api';
import { TelegramProvider, useTelegram } from '../src/lib/telegram-context';
import { LanguageProvider } from '../src/lib/language-context';
import { ThemeProvider } from '../src/lib/theme-context';
import { isTelegramLaunch, launchUserId, readLaunchInitData, uiConfirm } from '../src/lib/telegram';

const TG_USER_ID = 555000111;
const INIT_DATA = new URLSearchParams({
  user: JSON.stringify({ id: TG_USER_ID, first_name: 'አበበ' }),
  auth_date: String(Math.floor(Date.now() / 1000)),
  hash: 'a'.repeat(64),
}).toString();

function studentAuth(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'student-tg-1',
      email: null,
      fullName: 'አበበ',
      role: 'STUDENT',
      isActive: true,
      telegramId: String(TG_USER_ID),
      telegramUsername: null,
      hasPassword: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    tokens: { accessToken: 'tg-access', refreshToken: 'tg-refresh', expiresInSeconds: 86400 },
    isNewUser: true,
    ...overrides,
  };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mockWebApp() {
  const webApp = {
    initData: INIT_DATA,
    initDataUnsafe: { user: { id: TG_USER_ID, first_name: 'አበበ' } },
    version: '8.0',
    platform: 'android',
    colorScheme: 'light' as const,
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    isVersionAtLeast: () => true,
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    openLink: vi.fn(),
    openTelegramLink: vi.fn(),
    showAlert: vi.fn((_m: string, cb?: () => void) => cb?.()),
    showConfirm: vi.fn((_m: string, cb?: (ok: boolean) => void) => cb?.(true)),
    requestWriteAccess: vi.fn(),
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    MainButton: {} as never,
    HapticFeedback: { impactOccurred: vi.fn(), notificationOccurred: vi.fn(), selectionChanged: vi.fn() },
  };
  window.Telegram = { WebApp: webApp };
  return webApp;
}

function Probe() {
  const { status, launch } = useTelegram();
  return (
    <p data-testid="probe">
      {status}:{launch?.isNewUser ? 'new' : 'returning'}
    </p>
  );
}

function renderApp() {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <TelegramProvider>
          <Probe />
        </TelegramProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

describe('Telegram Mini App bootstrap', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, {})));
    await api.logout();
    sessionStorage.clear();
    localStorage.clear();
    delete window.Telegram;
    document.documentElement.removeAttribute('data-tg');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete window.Telegram;
  });

  it('helpers read the launch data from the URL Telegram opened', () => {
    window.history.replaceState(null, '', `/tg#tgWebAppData=${encodeURIComponent(INIT_DATA)}&tgWebAppVersion=8.0`);
    expect(isTelegramLaunch()).toBe(true);
    expect(readLaunchInitData()).toBe(INIT_DATA);
    expect(launchUserId(INIT_DATA)).toBe(String(TG_USER_ID));
    window.history.replaceState(null, '', '/');
  });

  it('a normal browser visit stays a website: no sign-in, children render', async () => {
    renderApp();
    expect(screen.getByTestId('probe').textContent).toBe('web:returning');
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/auth/telegram'), expect.anything());
  });

  it('signs in automatically with the raw initData and stores a normal session', async () => {
    const webApp = mockWebApp();
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      String(url).endsWith('/auth/telegram') ? json(201, { success: true, data: studentAuth() }) : json(200, {})
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('ready:new'));

    const [, init] = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/telegram'))!;
    expect(JSON.parse(init!.body as string)).toEqual({ initData: INIT_DATA });
    expect(webApp.ready).toHaveBeenCalled();
    expect(webApp.expand).toHaveBeenCalled();
    expect(api.getUser()?.telegramId).toBe(String(TG_USER_ID));
    expect(localStorage.getItem('eotc_refresh_token')).toBe('tg-refresh');
    expect(document.documentElement.hasAttribute('data-tg')).toBe(true);
  });

  it('shows the students-only screen to teachers instead of the app', async () => {
    mockWebApp();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(403, { success: false, error: { code: 'TELEGRAM_STUDENTS_ONLY', message: 'Students only' } }))
    );

    renderApp();
    await waitFor(() => expect(screen.getByRole('heading').textContent).toMatch(/ለተማሪዎች ብቻ|For students only/));
    expect(screen.queryByTestId('probe')).toBeNull();
  });

  it('offline launch reuses only the same student’s cached session', async () => {
    mockWebApp();
    // A previous launch signed this student in
    vi.stubGlobal('fetch', vi.fn(async () => json(200, { success: true, data: studentAuth({ isNewUser: false }) })));
    await api.loginWithTelegram(INIT_DATA);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderApp();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('ready:returning'));
  });

  it('offline launch by a different Telegram user does not open the cached account', async () => {
    mockWebApp();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(200, { success: true, data: studentAuth({ user: { ...studentAuth().user, telegramId: '999' } }) })
      )
    );
    await api.loginWithTelegram(INIT_DATA);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderApp();
    await waitFor(() => expect(screen.getByRole('heading').textContent).toMatch(/ኢንተርኔት የለም|No internet connection/));
  });

  it('an expired session is renewed silently from initData instead of going to /login', async () => {
    mockWebApp();
    vi.stubGlobal('fetch', vi.fn(async () => json(200, { success: true, data: studentAuth() })));
    await api.loginWithTelegram(INIT_DATA);

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/auth/refresh')) return json(401, { success: false, error: { code: 'TOKEN_REUSE_DETECTED' } });
      if (String(url).endsWith('/auth/telegram')) {
        return json(200, {
          success: true,
          data: studentAuth({ isNewUser: false, tokens: { accessToken: 'renewed', refreshToken: 'r2', expiresInSeconds: 1 } }),
        });
      }
      return json(200, {});
    });
    vi.stubGlobal('fetch', fetchMock);

    const token = await api.refreshSession();
    expect(token).toBe('renewed');
    expect(api.getUser()).not.toBeNull();
    expect(window.location.pathname).not.toBe('/login');
  });

  it('asks once for permission to send announcements, and turns them on when granted', async () => {
    const webApp = mockWebApp();
    webApp.requestWriteAccess.mockImplementation((cb?: (granted: boolean) => void) => cb?.(true));
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (String(url).endsWith('/auth/telegram')) return json(201, { success: true, data: studentAuth() });
      if (String(url).endsWith('/auth/telegram/notifications')) {
        return json(200, { success: true, data: { ...studentAuth().user, telegramNotify: true } });
      }
      return json(200, {});
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp();
    await waitFor(() => expect(webApp.requestWriteAccess).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/telegram/notifications'));
      expect(JSON.parse(call![1]!.body as string)).toEqual({ enabled: true });
    });

    // A later launch on the same device does not ask again
    cleanup();
    sessionStorage.clear();
    renderApp();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('ready:new'));
    expect(webApp.requestWriteAccess).toHaveBeenCalledTimes(1);
  });

  it('does not ask when the student already allowed messages', async () => {
    const webApp = mockWebApp();
    webApp.initDataUnsafe.user = { ...webApp.initDataUnsafe.user, allows_write_to_pm: true } as never;
    vi.stubGlobal('fetch', vi.fn(async () => json(201, { success: true, data: studentAuth() })));

    renderApp();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('ready:new'));
    expect(webApp.requestWriteAccess).not.toHaveBeenCalled();
  });

  it('uses Telegram’s native confirm dialog inside the Mini App', async () => {
    const webApp = mockWebApp();
    await expect(uiConfirm('Delete?')).resolves.toBe(true);
    expect(webApp.showConfirm).toHaveBeenCalled();
  });
});
