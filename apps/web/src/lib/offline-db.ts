import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  LearningPackageManifest,
  PackageDownloadStatus,
  OfflineQuizAttempt,
  StudentProgressUpdate,
  UserProfile,
} from '@eotc/shared';

export interface StoredPackage {
  chapterId: string;
  manifest: LearningPackageManifest;
  downloadStatus: PackageDownloadStatus;
  downloadedAt: string;
  textbookBlob?: Blob;
  referenceBlobs?: Record<string, Blob>;
  error?: string;
}

export interface CachedAuthSession {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  cachedAt: string;
}

interface EotcLearningDB extends DBSchema {
  packages: {
    key: string;
    value: StoredPackage;
  };
  quiz_attempts: {
    key: string;
    value: OfflineQuizAttempt;
    indexes: {
      'by-quiz': string;
      'by-sync-state': string;
    };
  };
  student_progress: {
    key: string;
    value: StudentProgressUpdate;
  };
  auth_cache: {
    key: string;
    value: CachedAuthSession;
  };
}

const DB_NAME = 'eotc_learning_offline_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EotcLearningDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<EotcLearningDB>> {
  if (typeof window === 'undefined') {
    // Return a dummy promise during SSR
    return Promise.reject(new Error('IndexedDB is only available in browser'));
  }

  if (!dbPromise) {
    dbPromise = openDB<EotcLearningDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('packages')) {
          db.createObjectStore('packages', { keyPath: 'chapterId' });
        }
        if (!db.objectStoreNames.contains('quiz_attempts')) {
          const attemptStore = db.createObjectStore('quiz_attempts', {
            keyPath: 'clientAttemptUuid',
          });
          attemptStore.createIndex('by-quiz', 'quizId');
          attemptStore.createIndex('by-sync-state', 'syncState');
        }
        if (!db.objectStoreNames.contains('student_progress')) {
          db.createObjectStore('student_progress', { keyPath: 'chapterId' });
        }
        if (!db.objectStoreNames.contains('auth_cache')) {
          db.createObjectStore('auth_cache');
        }
      },
    });
  }

  return dbPromise;
}

// ==========================================
// PACKAGES REPOSITORY
// ==========================================

export async function saveOfflinePackage(pkg: StoredPackage): Promise<void> {
  const db = await getOfflineDB();
  await db.put('packages', pkg);
}

export async function getOfflinePackage(chapterId: string): Promise<StoredPackage | undefined> {
  const db = await getOfflineDB();
  return db.get('packages', chapterId);
}

export async function getAllOfflinePackages(): Promise<StoredPackage[]> {
  const db = await getOfflineDB();
  return db.getAll('packages');
}

export async function deleteOfflinePackage(chapterId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('packages', chapterId);
}

// ==========================================
// QUIZ ATTEMPTS REPOSITORY (OFFLINE OUTBOX)
// ==========================================

export async function saveQuizAttempt(attempt: OfflineQuizAttempt): Promise<void> {
  const db = await getOfflineDB();
  await db.put('quiz_attempts', attempt);
}

export async function getQuizAttempts(quizId?: string): Promise<OfflineQuizAttempt[]> {
  const db = await getOfflineDB();
  if (quizId) {
    return db.getAllFromIndex('quiz_attempts', 'by-quiz', quizId);
  }
  return db.getAll('quiz_attempts');
}

export async function getPendingQuizAttempts(): Promise<OfflineQuizAttempt[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('quiz_attempts', 'by-sync-state', 'PENDING');
}

export async function updateQuizAttemptSyncState(
  clientAttemptUuid: string,
  syncState: 'SYNCED' | 'FAILED',
  syncedAt?: string
): Promise<void> {
  const db = await getOfflineDB();
  const attempt = await db.get('quiz_attempts', clientAttemptUuid);
  if (attempt) {
    attempt.syncState = syncState;
    if (syncedAt) attempt.syncedAt = syncedAt;
    await db.put('quiz_attempts', attempt);
  }
}

// ==========================================
// STUDENT PROGRESS
// ==========================================

export async function saveStudentProgress(progress: StudentProgressUpdate): Promise<void> {
  const db = await getOfflineDB();
  const update: StudentProgressUpdate = {
    ...progress,
    syncState: progress.syncState || 'PENDING',
  };
  await db.put('student_progress', update);
}

export async function updateStudentProgressSyncState(
  chapterId: string,
  syncState: 'SYNCED' | 'FAILED',
  syncedAt?: string
): Promise<void> {
  const db = await getOfflineDB();
  const item = await db.get('student_progress', chapterId);
  if (item) {
    item.syncState = syncState;
    if (syncedAt) item.syncedAt = syncedAt;
    await db.put('student_progress', item);
  }
}

export async function getStudentProgress(chapterId: string): Promise<StudentProgressUpdate | undefined> {
  const db = await getOfflineDB();
  return db.get('student_progress', chapterId);
}

export async function getAllStudentProgress(): Promise<StudentProgressUpdate[]> {
  const db = await getOfflineDB();
  return db.getAll('student_progress');
}

// ==========================================
// AUTH CACHE (OFFLINE RESTART RESILIENCE)
// ==========================================

export async function cacheAuthSession(session: CachedAuthSession): Promise<void> {
  const db = await getOfflineDB();
  await db.put('auth_cache', session, 'session');
}

export async function getCachedAuthSession(): Promise<CachedAuthSession | undefined> {
  const db = await getOfflineDB();
  return db.get('auth_cache', 'session');
}

export async function clearCachedAuthSession(): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('auth_cache', 'session');
}
