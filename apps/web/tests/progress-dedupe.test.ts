import { describe, it, expect } from 'vitest';
import {
  saveStudentProgress,
  getAllStudentProgress,
  updateStudentProgressSyncState,
  getStudentProgress,
} from '../src/lib/offline-db';
import { syncManager } from '../src/lib/sync-manager';

const now = () => new Date().toISOString();

describe('Progress tracking does not queue duplicate events', () => {
  it('keeps a single record per chapter, however many times it is completed', async () => {
    for (let i = 0; i < 4; i++) {
      await saveStudentProgress({ chapterId: 'dup-ch-1', isCompleted: true, lastReadPage: 5, lastStudiedAt: now() });
    }
    const records = (await getAllStudentProgress()).filter((p) => p.chapterId === 'dup-ch-1');
    expect(records).toHaveLength(1);
  });

  it('does not re-queue an already-synced completed chapter when it is completed or paged again', async () => {
    await saveStudentProgress({ chapterId: 'dup-ch-2', isCompleted: true, lastReadPage: 9, lastStudiedAt: now() });
    await updateStudentProgressSyncState('dup-ch-2', 'SYNCED', now());

    // Complete it again (e.g. passing the quiz a second time) and page through it
    await saveStudentProgress({ chapterId: 'dup-ch-2', isCompleted: true, lastReadPage: 9, lastStudiedAt: now() });
    await saveStudentProgress({ chapterId: 'dup-ch-2', isCompleted: true, lastReadPage: 3, lastStudiedAt: now() });

    expect((await getStudentProgress('dup-ch-2'))?.syncState).toBe('SYNCED');
    const items = await syncManager.getPendingItems();
    expect(items.some((i) => i.includes('dup-ch-2'))).toBe(false);
  });

  it('queues a chapter again only when something real changes', async () => {
    await saveStudentProgress({ chapterId: 'dup-ch-3', isCompleted: false, lastReadPage: 2, lastStudiedAt: now() });
    await updateStudentProgressSyncState('dup-ch-3', 'SYNCED', now());

    // Same page, nothing new
    await saveStudentProgress({ chapterId: 'dup-ch-3', isCompleted: false, lastReadPage: 2, lastStudiedAt: now() });
    expect((await getStudentProgress('dup-ch-3'))?.syncState).toBe('SYNCED');

    // Reads further: real progress
    await saveStudentProgress({ chapterId: 'dup-ch-3', isCompleted: false, lastReadPage: 6, lastStudiedAt: now() });
    expect((await getStudentProgress('dup-ch-3'))?.syncState).toBe('PENDING');

    // Completes it: real change
    await updateStudentProgressSyncState('dup-ch-3', 'SYNCED', now());
    await saveStudentProgress({ chapterId: 'dup-ch-3', isCompleted: true, lastReadPage: 6, lastStudiedAt: now() });
    expect((await getStudentProgress('dup-ch-3'))?.syncState).toBe('PENDING');
  });
});
