import type { LearningPackageManifest } from '@eotc/shared';

export type DownloadStatus = 'AVAILABLE_OFFLINE' | 'PARTIALLY_DOWNLOADED' | 'FAILED' | 'DOWNLOADING';
export type SyncState = 'PENDING' | 'SYNCED' | 'FAILED';

export interface OfflinePackageRecord {
  chapterId: string;
  subjectId: string;
  gradeId: string;
  title: string;
  version: number;
  manifest: LearningPackageManifest;
  localPdfUri: string | null;
  downloadStatus: DownloadStatus;
  downloadedAt: string;
  updatedAt: string;
}

export interface QuizAttemptRecord {
  clientAttemptUuid: string;
  quizId: string;
  chapterId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  answers: { questionId: string; selectedChoiceId: string }[];
  startedAt: string;
  completedAt: string;
  syncState: SyncState;
  syncedAt: string | null;
}

export interface StudentProgressRecord {
  chapterId: string;
  lastReadPage: number;
  isCompleted: boolean;
  timeSpentSeconds: number;
  updatedAt: string;
}

export interface AuthSessionRecord {
  id: string;
  studentId: string;
  email: string;
  fullName: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  cachedAt: string;
}

export interface ReferenceFileRecord {
  id: string;
  chapterId: string;
  title: string;
  localUri: string | null;
  checksum: string | null;
  fileSize: number | null;
}
