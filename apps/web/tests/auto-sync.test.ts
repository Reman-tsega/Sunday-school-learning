import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveQuizAttempt, getQuizAttempts } from '../src/lib/offline-db';
import { syncManager } from '../src/lib/sync-manager';
import { api } from '../src/lib/api';
import type { OfflineQuizAttempt } from '@eotc/shared';

function attempt(uuid: string): OfflineQuizAttempt {
  return {
    clientAttemptUuid: uuid,
    quizId: 'quiz-auto',
    quizVersion: 1,
    userId: 'student-auto',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    score: 8,
    maxScore: 10,
    passed: true,
    clientDevice: 'Web-PWA',
    isOffline: true,
    answers: [],
    syncState: 'PENDING',
    syncedAt: null,
  };
}

function okFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/student/sync/batch')) {
      const body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            syncedCount: body.attempts.length,
            failedCount: 0,
            progressSynced: 0,
            results: body.attempts.map((a: { clientAttemptUuid: string }) => ({
              clientAttemptUuid: a.clientAttemptUuid,
              serverAttemptId: `srv-${a.clientAttemptUuid}`,
              status: 'SYNCED',
            })),
          },
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ success: true, data: { progress: [] } }), { status: 200 });
  });
}

const batchCalls = (fetchMock: ReturnType<typeof okFetch>) =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes('/student/sync/batch')).length;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Automatic background sync', () => {
  beforeEach(() => {
    localStorage.setItem('eotc_auth_token', 'student-access-token');
    localStorage.setItem('eotc_refresh_token', 'student-refresh-token');
    syncManager.setAutoSyncEnabled(true);
  });

  afterEach(() => {
    syncManager.setAutoSyncEnabled(false);
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('uploads pending quiz results by itself when the connection comes back', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    await saveQuizAttempt(attempt('auto-1'));

    window.dispatchEvent(new Event('online'));
    await vi.waitFor(async () => {
      const [saved] = (await getQuizAttempts('quiz-auto')).filter((a) => a.clientAttemptUuid === 'auto-1');
      expect(saved?.syncState).toBe('SYNCED');
    }, { timeout: 8000, interval: 100 });
    expect(batchCalls(fetchMock)).toBe(1);
  });

  it('folds a burst of local saves into a single upload', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    await saveQuizAttempt(attempt('auto-2'));
    await saveQuizAttempt(attempt('auto-3'));
    await saveQuizAttempt(attempt('auto-4'));

    await vi.waitFor(() => expect(batchCalls(fetchMock)).toBe(1), { timeout: 9000, interval: 100 });
    await wait(500);
    expect(batchCalls(fetchMock)).toBe(1);
  });

  it('does nothing for a signed-out visitor', async () => {
    localStorage.clear();
    await api.logout();
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    await saveQuizAttempt(attempt('auto-5'));

    window.dispatchEvent(new Event('online'));
    await wait(2000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
