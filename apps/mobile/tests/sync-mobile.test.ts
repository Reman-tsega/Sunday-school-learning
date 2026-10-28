import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInMemorySqliteDb } from './mockSqlite';
import type { ISqliteDb } from '../src/database/sqliteDb';
import {
  quizAttemptRepository,
  studentProgressRepository,
} from '../src/database/sqliteDb';
import { mobileSyncManager } from '../src/services/syncManager';
import { saveOfflineQuizAttempt } from '../src/services/quizService';
import { setOfflineSimulated } from '../src/services/api';

describe('Phase 6 — Mobile Client Sync Engine & Outbox Recovery Tests', () => {
  let db: ISqliteDb;
  const mockToken = 'mock-mobile-jwt-token';

  beforeEach(async () => {
    vi.restoreAllMocks();
    setOfflineSimulated(false);
    db = await createInMemorySqliteDb();
  });

  it('queues offline attempt in SQLite and reconciles to SYNCED on server acknowledgment', async () => {
    const attemptUuid = '77777777-aaaa-4bbb-8ccc-dddddddddddd';
    await saveOfflineQuizAttempt(db, {
      clientAttemptUuid: attemptUuid,
      quizId: 'quiz-ch1',
      chapterId: 'ch1',
      score: 10,
      maxScore: 10,
      passed: true,
      answers: [{ questionId: 'q1', selectedChoiceId: 'c1' }],
    });

    await studentProgressRepository.saveProgress(db, 'ch1', 10, false);

    const pendingBefore = await mobileSyncManager.getPendingCount(db);
    expect(pendingBefore).toBe(1);

    // Mock fetch returning server response
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
              serverAttemptId: 'srv-mobile-123',
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

    const syncRes = await mobileSyncManager.syncNow(db, mockToken);
    expect(syncRes).not.toBeNull();
    expect(syncRes?.syncedCount).toBe(1);

    // Verify SQLite attempt updated to SYNCED
    const pendingAfter = await mobileSyncManager.getPendingCount(db);
    expect(pendingAfter).toBe(0);

    const attempts = await quizAttemptRepository.getAttemptsByChapter(db, 'ch1');
    expect(attempts[0]?.syncState).toBe('SYNCED');
    expect(attempts[0]?.syncedAt).toBeDefined();
  });

  it('handles DUPLICATE status gracefully when attempt was already processed on server', async () => {
    const attemptUuid = '66666666-aaaa-4bbb-8ccc-dddddddddddd';
    await saveOfflineQuizAttempt(db, {
      clientAttemptUuid: attemptUuid,
      quizId: 'quiz-ch1',
      chapterId: 'ch1',
      score: 10,
      maxScore: 10,
      passed: true,
      answers: [],
    });

    // Mock response returning DUPLICATE (e.g. server had received it during a dropped connection)
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
              serverAttemptId: 'srv-existing-456',
              status: 'DUPLICATE',
              validatedScore: 10,
              passed: true,
              message: 'Already recorded idempotently',
            },
          ],
          progressSynced: 0,
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const syncRes = await mobileSyncManager.syncNow(db, mockToken);
    expect(syncRes?.results[0]?.status).toBe('DUPLICATE');

    const pendingAfter = await mobileSyncManager.getPendingCount(db);
    expect(pendingAfter).toBe(0);

    const attempts = await quizAttemptRepository.getAttemptsByChapter(db, 'ch1');
    expect(attempts[0]?.syncState).toBe('SYNCED');
  });

  it('recovers from intermittent network glitch using exponential retry', async () => {
    const attemptUuid = '55555555-aaaa-4bbb-8ccc-dddddddddddd';
    await saveOfflineQuizAttempt(db, {
      clientAttemptUuid: attemptUuid,
      quizId: 'quiz-ch1',
      chapterId: 'ch1',
      score: 10,
      maxScore: 10,
      passed: true,
      answers: [],
    });

    let calls = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        throw new Error('Temporary connection dropped');
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
                serverAttemptId: 'srv-retry-789',
                status: 'SYNCED',
                validatedScore: 10,
                passed: true,
              },
            ],
            progressSynced: 0,
          },
        }),
      };
    });
    vi.stubGlobal('fetch', mockFetch);

    const syncRes = await mobileSyncManager.syncNow(db, mockToken);
    expect(calls).toBe(2);
    expect(syncRes?.syncedCount).toBe(1);

    const attempts = await quizAttemptRepository.getAttemptsByChapter(db, 'ch1');
    expect(attempts[0]?.syncState).toBe('SYNCED');
  });

  it('does not send sync requests when airplane / offline mode is active', async () => {
    setOfflineSimulated(true);

    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const syncRes = await mobileSyncManager.syncNow(db, mockToken);
    expect(syncRes).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
