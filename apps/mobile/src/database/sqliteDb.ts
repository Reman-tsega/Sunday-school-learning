import { CREATE_TABLES_SQL } from './schema';
import type {
  OfflinePackageRecord,
  QuizAttemptRecord,
  StudentProgressRecord,
  AuthSessionRecord,
  DownloadStatus,
  SyncState,
} from '../types';
import type { LearningPackageManifest } from '@eotc/shared';

export interface ISqliteDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

let activeDbInstance: ISqliteDb | null = null;

export function setActiveDatabase(db: ISqliteDb): void {
  activeDbInstance = db;
}

export async function getDatabase(): Promise<ISqliteDb> {
  if (activeDbInstance) {
    return activeDbInstance;
  }
  // Dynamically import expo-sqlite in React Native runtime
  const SQLite = await import('expo-sqlite');
  const nativeDb = await SQLite.openDatabaseAsync('eotc_offline.db');

  const wrappedDb: ISqliteDb = {
    async execAsync(sql: string) {
      await nativeDb.execAsync(sql);
    },
    async runAsync(sql: string, params: unknown[] = []) {
      const res = await (nativeDb.runAsync as any)(sql, ...params);
      return { changes: res.changes, lastInsertRowId: res.lastInsertRowId };
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return (nativeDb.getAllAsync as any)(sql, ...params);
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return (nativeDb.getFirstAsync as any)(sql, ...params);
    },
  };

  await initDatabase(wrappedDb);
  activeDbInstance = wrappedDb;
  return activeDbInstance;
}

export async function initDatabase(db: ISqliteDb): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);
}

// -------------------------------------------------------------
// Package Repository
// -------------------------------------------------------------
export const packageRepository = {
  async savePackage(db: ISqliteDb, pkg: OfflinePackageRecord): Promise<void> {
    const existing = await this.getPackage(db, pkg.chapterId);
    const manifestJson = JSON.stringify(pkg.manifest);
    const now = new Date().toISOString();

    if (existing) {
      await db.runAsync(
        `UPDATE packages
         SET subjectId = ?, gradeId = ?, title = ?, version = ?, manifestJson = ?,
             localPdfUri = ?, downloadStatus = ?, updatedAt = ?
         WHERE chapterId = ?`,
        [
          pkg.subjectId,
          pkg.gradeId,
          pkg.title,
          pkg.version,
          manifestJson,
          pkg.localPdfUri,
          pkg.downloadStatus,
          now,
          pkg.chapterId,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO packages (chapterId, subjectId, gradeId, title, version, manifestJson, localPdfUri, downloadStatus, downloadedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pkg.chapterId,
          pkg.subjectId,
          pkg.gradeId,
          pkg.title,
          pkg.version,
          manifestJson,
          pkg.localPdfUri,
          pkg.downloadStatus,
          pkg.downloadedAt || now,
          now,
        ]
      );
    }
  },

  async getPackage(db: ISqliteDb, chapterId: string): Promise<OfflinePackageRecord | null> {
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM packages WHERE chapterId = ?`,
      [chapterId]
    );
    if (!row) return null;

    return {
      chapterId: row.chapterId,
      subjectId: row.subjectId,
      gradeId: row.gradeId,
      title: row.title,
      version: row.version,
      manifest: JSON.parse(row.manifestJson) as LearningPackageManifest,
      localPdfUri: row.localPdfUri,
      downloadStatus: row.downloadStatus as DownloadStatus,
      downloadedAt: row.downloadedAt,
      updatedAt: row.updatedAt,
    };
  },

  async getAllPackages(db: ISqliteDb): Promise<OfflinePackageRecord[]> {
    const rows = await db.getAllAsync<any>(`SELECT * FROM packages ORDER BY updatedAt DESC`);
    return rows.map((row) => ({
      chapterId: row.chapterId,
      subjectId: row.subjectId,
      gradeId: row.gradeId,
      title: row.title,
      version: row.version,
      manifest: JSON.parse(row.manifestJson) as LearningPackageManifest,
      localPdfUri: row.localPdfUri,
      downloadStatus: row.downloadStatus as DownloadStatus,
      downloadedAt: row.downloadedAt,
      updatedAt: row.updatedAt,
    }));
  },

  async deletePackage(db: ISqliteDb, chapterId: string): Promise<void> {
    await db.runAsync(`DELETE FROM packages WHERE chapterId = ?`, [chapterId]);
    await db.runAsync(`DELETE FROM reference_files WHERE chapterId = ?`, [chapterId]);
  },
};

// -------------------------------------------------------------
// Quiz Attempt Repository
// -------------------------------------------------------------
export const quizAttemptRepository = {
  async saveAttempt(db: ISqliteDb, attempt: QuizAttemptRecord): Promise<void> {
    const answersJson = JSON.stringify(attempt.answers);
    await db.runAsync(
      `INSERT OR REPLACE INTO quiz_attempts (clientAttemptUuid, quizId, chapterId, score, maxScore, passed, answersJson, startedAt, completedAt, syncState, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attempt.clientAttemptUuid,
        attempt.quizId,
        attempt.chapterId,
        attempt.score,
        attempt.maxScore,
        attempt.passed ? 1 : 0,
        answersJson,
        attempt.startedAt,
        attempt.completedAt,
        attempt.syncState,
        attempt.syncedAt,
      ]
    );
  },

  async getAttemptsByChapter(db: ISqliteDb, chapterId: string): Promise<QuizAttemptRecord[]> {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM quiz_attempts WHERE chapterId = ? ORDER BY completedAt DESC`,
      [chapterId]
    );
    return rows.map(this.mapRowToAttempt);
  },

  async getAttemptsByQuiz(db: ISqliteDb, quizId: string): Promise<QuizAttemptRecord[]> {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM quiz_attempts WHERE quizId = ? ORDER BY completedAt DESC`,
      [quizId]
    );
    return rows.map(this.mapRowToAttempt);
  },

  async getPendingSyncAttempts(db: ISqliteDb): Promise<QuizAttemptRecord[]> {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM quiz_attempts WHERE syncState = 'PENDING' ORDER BY completedAt ASC`
    );
    return rows.map(this.mapRowToAttempt);
  },

  async markAttemptSynced(db: ISqliteDb, clientAttemptUuid: string, syncedAt: string): Promise<void> {
    await db.runAsync(
      `UPDATE quiz_attempts SET syncState = 'SYNCED', syncedAt = ? WHERE clientAttemptUuid = ?`,
      [syncedAt, clientAttemptUuid]
    );
  },

  mapRowToAttempt(row: any): QuizAttemptRecord {
    return {
      clientAttemptUuid: row.clientAttemptUuid,
      quizId: row.quizId,
      chapterId: row.chapterId,
      score: row.score,
      maxScore: row.maxScore,
      passed: Boolean(row.passed),
      answers: JSON.parse(row.answersJson),
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      syncState: row.syncState as SyncState,
      syncedAt: row.syncedAt,
    };
  },
};

// -------------------------------------------------------------
// Student Progress Repository
// -------------------------------------------------------------
export const studentProgressRepository = {
  async saveProgress(
    db: ISqliteDb,
    chapterId: string,
    lastReadPage: number,
    isCompleted = false,
    timeSpentDelta = 0
  ): Promise<void> {
    const existing = await this.getProgress(db, chapterId);
    const now = new Date().toISOString();
    const newTime = (existing?.timeSpentSeconds || 0) + timeSpentDelta;
    const completedFlag = isCompleted || (existing?.isCompleted ?? false) ? 1 : 0;

    if (existing) {
      await db.runAsync(
        `UPDATE student_progress
         SET lastReadPage = ?, isCompleted = ?, timeSpentSeconds = ?, updatedAt = ?
         WHERE chapterId = ?`,
        [lastReadPage, completedFlag, newTime, now, chapterId]
      );
    } else {
      await db.runAsync(
        `INSERT INTO student_progress (chapterId, lastReadPage, isCompleted, timeSpentSeconds, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [chapterId, lastReadPage, completedFlag, newTime, now]
      );
    }
  },

  async getProgress(db: ISqliteDb, chapterId: string): Promise<StudentProgressRecord | null> {
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM student_progress WHERE chapterId = ?`,
      [chapterId]
    );
    if (!row) return null;
    return {
      chapterId: row.chapterId,
      lastReadPage: row.lastReadPage,
      isCompleted: Boolean(row.isCompleted),
      timeSpentSeconds: row.timeSpentSeconds,
      updatedAt: row.updatedAt,
    };
  },
};

// -------------------------------------------------------------
// Auth Session Repository
// -------------------------------------------------------------
export const authSessionRepository = {
  async saveSession(db: ISqliteDb, session: AuthSessionRecord): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO auth_session (id, studentId, email, fullName, role, accessToken, refreshToken, cachedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id || 'current_session',
        session.studentId,
        session.email,
        session.fullName,
        session.role,
        session.accessToken,
        session.refreshToken,
        session.cachedAt || new Date().toISOString(),
      ]
    );
  },

  async getSession(db: ISqliteDb): Promise<AuthSessionRecord | null> {
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM auth_session WHERE id = 'current_session'`
    );
    if (!row) return null;
    return {
      id: row.id,
      studentId: row.studentId,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      cachedAt: row.cachedAt,
    };
  },

  async clearSession(db: ISqliteDb): Promise<void> {
    await db.runAsync(`DELETE FROM auth_session WHERE id = 'current_session'`);
  },
};
