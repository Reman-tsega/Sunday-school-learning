import type { ISqliteDb } from '../database/sqliteDb';
import { quizAttemptRepository } from '../database/sqliteDb';
import { getApiBaseUrl, isOfflineMode } from './api';
import type { BatchSyncResponseData, BatchSyncResultItem } from '@eotc/shared';

export interface MobileSyncState {
  status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

export type MobileSyncListener = (state: MobileSyncState) => void;

class MobileSyncManager {
  private status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error' = 'idle';
  private lastSyncedAt: string | null = null;
  private errorMessage: string | null = null;
  private listeners: Set<MobileSyncListener> = new Set();
  private isSyncing = false;

  subscribe(listener: MobileSyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(pendingCount: number) {
    const state: MobileSyncState = {
      status: this.status,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.errorMessage,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  async getPendingCount(db: ISqliteDb): Promise<number> {
    try {
      const pending = await quizAttemptRepository.getPendingSyncAttempts(db);
      return pending.length;
    } catch {
      return 0;
    }
  }

  async syncNow(db: ISqliteDb, token: string): Promise<BatchSyncResponseData | null> {
    if (this.isSyncing) return null;
    if (isOfflineMode()) {
      this.status = 'offline';
      this.notify(await this.getPendingCount(db));
      return null;
    }

    this.isSyncing = true;
    this.status = 'syncing';
    this.errorMessage = null;
    const pendingBefore = await this.getPendingCount(db);
    this.notify(pendingBefore);

    try {
      const pendingAttempts = await quizAttemptRepository.getPendingSyncAttempts(db);
      const progressRows = await db.getAllAsync<any>(`SELECT * FROM student_progress`);

      if (pendingAttempts.length === 0 && progressRows.length === 0) {
        this.status = 'synced';
        this.notify(0);
        return null;
      }

      const payload = {
        attempts: pendingAttempts.map((a) => ({
          clientAttemptUuid: a.clientAttemptUuid,
          quizId: a.quizId,
          quizVersion: 1,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          score: a.score,
          maxScore: a.maxScore,
          passed: a.passed,
          clientDevice: 'Mobile-App',
          isOffline: true,
          answers: a.answers.map((ans) => ({
            questionId: ans.questionId,
            selectedChoiceId: ans.selectedChoiceId,
          })),
        })),
        progress: progressRows.map((p) => ({
          chapterId: p.chapterId,
          isCompleted: Boolean(p.isCompleted),
          lastReadPage: p.lastReadPage,
          lastStudiedAt: p.updatedAt,
        })),
      };

      const result = await this.postBatchWithRetry(token, payload);

      // Reconcile into SQLite
      const now = new Date().toISOString();
      for (const res of result.results) {
        if (res.status === 'SYNCED' || res.status === 'DUPLICATE') {
          await quizAttemptRepository.markAttemptSynced(db, res.clientAttemptUuid, now);
        }
      }

      this.status = 'synced';
      this.lastSyncedAt = now;
      const pendingAfter = await this.getPendingCount(db);
      this.notify(pendingAfter);
      return result;
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = err.message || 'Mobile sync failed';
      const count = await this.getPendingCount(db);
      this.notify(count);
      throw err;
    } finally {
      this.isSyncing = false;
    }
  }

  private async postBatchWithRetry(
    token: string,
    payload: any,
    maxRetries = 3
  ): Promise<BatchSyncResponseData> {
    let lastError: Error | null = null;
    const baseUrl = getApiBaseUrl();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(`${baseUrl}/student/sync/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          return json.data as BatchSyncResponseData;
        }

        if (res.status >= 400 && res.status < 500) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Sync rejected: HTTP ${res.status}`);
        }

        throw new Error(`Server returned HTTP ${res.status}`);
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError || new Error('Sync failed after maximum retries');
  }
}

export const mobileSyncManager = new MobileSyncManager();
