import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveQuizAttempt,
  getQuizAttempts,
  saveStudentProgress,
  cacheAuthSession,
} from '../src/lib/offline-db';
import { syncManager } from '../src/lib/sync-manager';
import type { OfflineQuizAttempt } from '@eotc/shared';

describe('Phase 6 — Web Client Sync Engine & Outbox Recovery Tests', () => {
  const mockToken = 'mock-jwt-student-token';

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Cache an active student session in IndexedDB
    await cacheAuthSession({
      user: {
        id: 'student-test-user-id',
        email: 'student@eotc.org',
        fullName: 'ተማሪ ቴዎድሮስ',
        role: 'STUDENT',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      accessToken: mockToken,
      refreshToken: 'mock-refresh-token',
      cachedAt: new Date().toISOString(),
    });
  });

  it('queues offline attempt in IndexedDB and synchronizes it to server', async () => {
    const attemptUuid = '99999999-aaaa-4bbb-8ccc-dddddddddddd';
    const offlineAttempt: OfflineQuizAttempt = {
      clientAttemptUuid: attemptUuid,
      quizId: 'quiz-ch1',
      quizVersion: 1,
      userId: 'student-test-user-id',
      startedAt: new Date(Date.now() - 60000).toISOString(),
      completedAt: new Date().toISOString(),
      score: 10,
      maxScore: 10,
      passed: true,
      clientDevice: 'Web-PWA',
      isOffline: true,
      answers: [{ questionId: 'q1', selectedChoiceId: 'c1' }],
      syncState: 'PENDING',
      syncedAt: null,
    };

    await saveQuizAttempt(offlineAttempt);
    await saveStudentProgress({
      chapterId: 'ch1',
      isCompleted: true,
      lastReadPage: 15,
      lastStudiedAt: new Date().toISOString(),
    });

    const pendingCountBefore = await syncManager.getPendingCount();
    expect(pendingCountBefore).toBeGreaterThanOrEqual(1);

    // Mock global fetch returning 200 OK batch sync response
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          syncedCount: 1,
          failedCount: 0,
          results: [
            {
              clientAttemptUuid: attemptUuid,
              serverAttemptId: 'srv-attempt-123',
              status: 'SYNCED',
              validatedScore: 10,
              passed: true,
            },
          ],
          progressSynced: 1,
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    // Trigger synchronization
    const syncRes = await syncManager.triggerSync();

    expect(syncRes).not.toBeNull();
    expect(syncRes?.syncedCount).toBe(1);
    expect(syncRes?.results[0]?.status).toBe('SYNCED');

    // Verify IndexedDB record updated to SYNCED
    const attempts = await getQuizAttempts('quiz-ch1');
    const updated = attempts.find((a) => a.clientAttemptUuid === attemptUuid);
    expect(updated?.syncState).toBe('SYNCED');
    expect(updated?.syncedAt).toBeDefined();

    // Verify pending queue is now empty
    const pendingAfter = await syncManager.getPendingCount();
    expect(pendingAfter).toBe(0);
  });

  it('recovers gracefully from transient network failures via retry backoff', async () => {
    const attemptUuid = '88888888-aaaa-4bbb-8ccc-dddddddddddd';
    await saveQuizAttempt({
      clientAttemptUuid: attemptUuid,
      quizId: 'quiz-ch2',
      quizVersion: 1,
      userId: 'student-test-user-id',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      score: 5,
      maxScore: 10,
      passed: false,
      clientDevice: 'Web-PWA',
      isOffline: true,
      answers: [],
      syncState: 'PENDING',
      syncedAt: null,
    });

    let calls = 0;
    // Fails on 1st call, succeeds on 2nd call (simulating transient glitch & recovery)
    const mockFetch = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        throw new Error('Network timeout (simulated interrupted request)');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            syncedCount: 1,
            failedCount: 0,
            results: [
              {
                clientAttemptUuid: attemptUuid,
                serverAttemptId: 'srv-recovered-456',
                status: 'SYNCED',
                validatedScore: 5,
                passed: false,
              },
            ],
            progressSynced: 0,
          },
        }),
      };
    });
    vi.stubGlobal('fetch', mockFetch);

    const syncRes = await syncManager.triggerSync();
    expect(calls).toBe(2);
    expect(syncRes?.syncedCount).toBe(1);

    const attempts = await getQuizAttempts('quiz-ch2');
    const updated = attempts.find((a) => a.clientAttemptUuid === attemptUuid);
    expect(updated?.syncState).toBe('SYNCED');
  });
});
