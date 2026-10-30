import {
  getPendingQuizAttempts,
  updateQuizAttemptSyncState,
  getAllStudentProgress,
  getAllOfflinePackages,
  updateStudentProgressSyncState,
  getCachedAuthSession,
} from './offline-db';
import { api } from './api';
import type { BatchSyncResponseData } from '@eotc/shared';

import { API_BASE_URL } from '@/lib/api-base';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  /** Human-readable list of what is waiting to be uploaded */
  pendingItems: string[];
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncManager {
  private status: SyncStatus = 'idle';
  private lastSyncedAt: string | null = null;
  private errorMessage: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private isSyncInProgress = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Syncing is user-driven: new progress only raises the pending count shown on the sync icon
      // and is sent when the student taps Sync.
      window.addEventListener('online', () => {
        this.notify();
      });
      window.addEventListener('eotc:progress-updated', () => {
        this.notify();
      });
      // Any local save (progress, quiz attempt) refreshes the pending count
      window.addEventListener('eotc:sync-state-changed', () => {
        this.notify();
      });
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private async notify(): Promise<void> {
    const pendingItems = await this.getPendingItems();
    const state: SyncState = {
      status: this.status,
      pendingCount: pendingItems.length,
      pendingItems,
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.errorMessage,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  /** Describes each local record that has not been uploaded yet. */
  async getPendingItems(): Promise<string[]> {
    try {
      const [attempts, allProgress, packages] = await Promise.all([
        getPendingQuizAttempts(),
        getAllStudentProgress(),
        getAllOfflinePackages().catch(() => []),
      ]);
      const titles = new Map(packages.map((p) => [p.chapterId, p.manifest?.chapterTitle || '']));
      const items: string[] = [];
      for (const p of allProgress.filter((x) => x.syncState !== 'SYNCED')) {
        const name = titles.get(p.chapterId) || 'Chapter';
        items.push(p.isCompleted ? `${name} — marked completed` : `${name} — reading progress (page ${p.lastReadPage})`);
      }
      for (const a of attempts) {
        items.push(`Quiz result — ${a.score}/${a.maxScore}${a.passed ? ' (passed)' : ''}`);
      }
      return items;
    } catch {
      return [];
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      const attempts = await getPendingQuizAttempts();
      const allProgress = await getAllStudentProgress();
      const pendingProgress = allProgress.filter((p) => p.syncState !== 'SYNCED');
      return attempts.length + pendingProgress.length;
    } catch {
      return 0;
    }
  }

  async triggerSync(): Promise<BatchSyncResponseData | null> {
    if (this.isSyncInProgress) return null;
    this.isSyncInProgress = true;
    this.status = 'syncing';
    this.errorMessage = null;
    await this.notify();

    try {
      // 1. Resolve authentication token (Memory -> localStorage -> IndexedDB -> refreshSession)
      let token = api.getToken();
      if (!token) {
        const session = await getCachedAuthSession();
        token = session?.accessToken || null;
      }

      if (!token) {
        // Try silent refresh
        token = await api.refreshSession();
      }

      if (!token) {
        this.status = 'error';
        this.errorMessage = 'Please sign in to synchronize offline progress.';
        await this.notify();
        throw new Error(this.errorMessage);
      }

      const pendingAttempts = await getPendingQuizAttempts();
      const allProgress = await getAllStudentProgress();
      const pendingProgress = allProgress.filter((p) => p.syncState !== 'SYNCED');

      if (pendingAttempts.length === 0 && pendingProgress.length === 0) {
        await this.pullServerProgress(token);
        this.status = 'synced';
        await this.notify();
        return null;
      }

      const payload = {
        attempts: pendingAttempts.map((a) => ({
          clientAttemptUuid: a.clientAttemptUuid,
          quizId: a.quizId,
          quizVersion: a.quizVersion || 1,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          score: a.score,
          maxScore: a.maxScore,
          passed: a.passed,
          clientDevice: 'Web-PWA',
          isOffline: a.isOffline ?? true,
          answers: a.answers.map((ans) => ({
            questionId: ans.questionId,
            selectedChoiceId: ans.selectedChoiceId,
          })),
        })),
        progress: pendingProgress.map((p) => ({
          chapterId: p.chapterId,
          isCompleted: p.isCompleted,
          lastReadPage: p.lastReadPage,
          lastStudiedAt: p.lastStudiedAt,
        })),
      };

      const syncResult = await this.sendWithBackoff(token, payload);

      // Process and commit results in IndexedDB
      const now = new Date().toISOString();
      for (const res of syncResult.results) {
        if (res.status === 'SYNCED' || res.status === 'DUPLICATE') {
          await updateQuizAttemptSyncState(res.clientAttemptUuid, 'SYNCED', now);
        } else if (res.status === 'REJECTED') {
          await updateQuizAttemptSyncState(res.clientAttemptUuid, 'FAILED');
        }
      }

      for (const p of pendingProgress) {
        await updateStudentProgressSyncState(p.chapterId, 'SYNCED', now);
      }

      // Also pull latest server progress to keep device in complete sync
      await this.pullServerProgress(token);

      this.status = 'synced';
      this.lastSyncedAt = now;
      this.errorMessage = null;
      await this.notify();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('eotc:sync-complete', { detail: syncResult }));
      }

      return syncResult;
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = err.message || 'Synchronization failed';
      await this.notify();
      throw err;
    } finally {
      this.isSyncInProgress = false;
    }
  }

  async pullServerProgress(explicitToken?: string): Promise<void> {
    try {
      let token = explicitToken || api.getToken();
      if (!token) {
        const session = await getCachedAuthSession();
        token = session?.accessToken || null;
      }
      if (!token) {
        token = await api.refreshSession();
      }
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/student/sync/pull`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const json = await res.json();
      const data = json.data;
      if (!data) return;

      const { saveStudentProgress, getStudentProgress } = await import('./offline-db');

      // Ingest progress from server
      if (Array.isArray(data.progress)) {
        for (const item of data.progress) {
          const local = await getStudentProgress(item.chapterId);
          // If local doesn't exist or server has higher completed or read state
          if (
            !local ||
            (item.isCompleted && !local.isCompleted) ||
            item.lastReadPage > (local.lastReadPage || 0)
          ) {
            await saveStudentProgress({
              chapterId: item.chapterId,
              isCompleted: item.isCompleted || local?.isCompleted || false,
              lastReadPage: Math.max(item.lastReadPage || 1, local?.lastReadPage || 1),
              lastStudiedAt: item.lastStudiedAt || item.updatedAt || new Date().toISOString(),
              syncState: 'SYNCED',
              syncedAt: item.updatedAt || new Date().toISOString(),
            });
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('eotc:progress-updated', { detail: { pulled: true } }));
      }
    } catch (err) {
      console.warn('Failed to pull server progress:', err);
    }
  }

  private async sendWithBackoff(
    initialToken: string,
    payload: any,
    maxRetries = 3
  ): Promise<BatchSyncResponseData> {
    let currentToken = initialToken;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE_URL}/student/sync/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          return json.data as BatchSyncResponseData;
        }

        // 401 Unauthorized handling: Automatically refresh token and retry!
        if (res.status === 401) {
          const newToken = await api.refreshSession();
          if (newToken) {
            currentToken = newToken;
            const retryRes = await fetch(`${API_BASE_URL}/student/sync/batch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentToken}`,
              },
              body: JSON.stringify(payload),
            });
            if (retryRes.ok) {
              const json = await retryRes.json();
              return json.data as BatchSyncResponseData;
            }
          }
          await api.handleSessionExpired('session_expired');
          throw new Error('Your session has expired. You have been signed out.');
        }

        if (res.status >= 400 && res.status < 500) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Sync rejected: HTTP ${res.status}`);
        }

        throw new Error(`Server returned HTTP ${res.status}`);
      } catch (err: any) {
        lastError = err;
        if (
          attempt < maxRetries - 1 &&
          !err.message?.includes('expired') &&
          !err.message?.includes('sign in')
        ) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    throw lastError || new Error('Sync failed after maximum retry attempts');
  }
}

export const syncManager = new SyncManager();
