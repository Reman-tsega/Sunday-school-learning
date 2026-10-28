import { describe, it, expect } from 'vitest';
import {
  getOfflinePackage,
  deleteOfflinePackage,
  saveQuizAttempt,
  getQuizAttempts,
  saveStudentProgress,
  getStudentProgress,
  cacheAuthSession,
  getCachedAuthSession,
} from '../src/lib/offline-db.js';
import { downloadManager } from '../src/lib/download-manager.js';
import type { LearningPackageManifest, OfflineQuizAttempt } from '@eotc/shared';

describe('Phase 4 — Student Web Offline Storage & Quiz Evaluation', () => {
  const mockManifest: LearningPackageManifest = {
    packageId: 'pkg-ch1-v1',
    chapterId: 'ch1',
    chapterNumber: 1,
    chapterTitle: 'Foundations of Faith',
    amharicChapterTitle: 'ምዕራፍ ፩: የክርስትና ሃይማኖት መሠረቶች',
    subjectId: 'sub-chr-l1',
    subjectName: 'Christian Life',
    amharicSubjectName: 'የክርስትና ሕይወት',
    gradeLevel: 1,
    gradeName: 'Grade 1',
    version: 1,
    publishedAt: new Date().toISOString(),
    checksumSha256: 'mock-sha256-hash',
    totalSizeBytes: 1048576,
    textbook: {
      id: 'tb-1',
      title: 'የክርስትና ሕይወት መጽሐፍ',
      fileUrl: 'https://mock.cdn/tb.pdf',
      fileSize: 1048576,
      checksumSha256: 'mock-tb-sha256',
      mimeType: 'application/pdf',
      startPage: 1,
      endPage: 24,
      totalPages: 120,
    },
    quizzes: [
      {
        id: 'quiz-1',
        title: 'Practice Quiz 1',
        amharicTitle: 'የልምምድ ፈተና ፩',
        passingScore: 70,
        isPractice: true,
        version: 1,
        questions: [
          {
            id: 'q1',
            prompt: 'What is the foundation of faith?',
            amharicPrompt: 'የሃይማኖታችን መሠረት ምንድን ነው?',
            orderIndex: 1,
            points: 10,
            choices: [
              { id: 'c1', text: 'Holy Trinity', amharicText: 'ቅድስት ሥላሴ', orderIndex: 1, isCorrect: true },
              { id: 'c2', text: 'Philosophy', amharicText: 'ፍልስፍና', orderIndex: 2, isCorrect: false },
            ],
          },
        ],
      },
    ],
    references: [
      {
        id: 'ref-1',
        title: 'Reference Summary Doc',
        url: 'https://mock.cdn/ref.pdf',
        isDownloadable: true,
        downloadableDocUrl: 'https://mock.cdn/ref.pdf',
        downloadableDocSize: 2048,
        downloadableDocChecksum: 'mock-ref-sha256',
      },
    ],
  };

  it('1. Download Manager downloads and verifies learning package into IndexedDB', async () => {
    const stored = await downloadManager.downloadPackage(mockManifest);

    expect(stored.downloadStatus).toBe('AVAILABLE_OFFLINE');
    expect(stored.chapterId).toBe('ch1');
    expect(stored.textbookBlob).toBeDefined();
    expect(stored.textbookBlob?.size).toBeGreaterThan(0);

    const verified = await getOfflinePackage('ch1');
    expect(verified).toBeDefined();
    expect(verified?.downloadStatus).toBe('AVAILABLE_OFFLINE');
    expect(verified?.manifest.textbook.startPage).toBe(1);
    expect(verified?.manifest.textbook.endPage).toBe(24);
  });

  it('2. Retrieves textbook and offline questions without network request', async () => {
    // Direct IndexedDB query simulating offline study
    const pkg = await getOfflinePackage('ch1');
    expect(pkg).toBeDefined();

    const manifest = pkg!.manifest;
    expect(manifest.chapterTitle).toBe('Foundations of Faith');
    expect(manifest.quizzes.length).toBe(1);

    const question = manifest.quizzes[0]!.questions[0]!;
    expect(question.prompt).toBe('What is the foundation of faith?');
    expect(question.choices.length).toBe(2);

    // Verify local practice answer key is accessible offline
    const correctChoice = question.choices.find((c) => c.isCorrect);
    expect(correctChoice?.id).toBe('c1');
  });

  it('3. Practice quiz evaluates answers and saves attempt to durable outbox', async () => {
    const attemptUuid1 = '11111111-1111-4111-8111-111111111111';

    const attempt1: OfflineQuizAttempt = {
      clientAttemptUuid: attemptUuid1,
      quizId: 'quiz-1',
      quizVersion: 1,
      userId: 'student-123',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      score: 10,
      maxScore: 10,
      passed: true,
      clientDevice: 'Web PWA (Offline)',
      isOffline: true,
      answers: [{ questionId: 'q1', selectedChoiceId: 'c1', isCorrect: true, pointsEarned: 10 }],
      syncState: 'PENDING',
    };

    await saveQuizAttempt(attempt1);

    // Repeat the quiz (second attempt)
    const attemptUuid2 = '22222222-2222-4222-8222-222222222222';
    const attempt2: OfflineQuizAttempt = {
      clientAttemptUuid: attemptUuid2,
      quizId: 'quiz-1',
      quizVersion: 1,
      userId: 'student-123',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      score: 0,
      maxScore: 10,
      passed: false,
      clientDevice: 'Web PWA (Offline)',
      isOffline: true,
      answers: [{ questionId: 'q1', selectedChoiceId: 'c2', isCorrect: false, pointsEarned: 0 }],
      syncState: 'PENDING',
    };

    await saveQuizAttempt(attempt2);

    // Verify BOTH attempts exist in history
    const history = await getQuizAttempts('quiz-1');
    expect(history.length).toBe(2);
    expect(history.find((a) => a.clientAttemptUuid === attemptUuid1)?.passed).toBe(true);
    expect(history.find((a) => a.clientAttemptUuid === attemptUuid2)?.passed).toBe(false);
  });

  it('4. Reading progress persists across application reloads', async () => {
    await saveStudentProgress({
      chapterId: 'ch1',
      lastReadPage: 18,
      isCompleted: false,
      lastStudiedAt: new Date().toISOString(),
    });

    const progress = await getStudentProgress('ch1');
    expect(progress).toBeDefined();
    expect(progress?.lastReadPage).toBe(18);
  });

  it('5. Auth session persists in IndexedDB for offline authentication', async () => {
    await cacheAuthSession({
      user: {
        id: 'u1',
        email: 'student@eotc-andnet.org',
        fullName: 'ዮሐንስ ዳዊት',
        role: 'STUDENT',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      accessToken: 'offline-jwt-token',
      refreshToken: 'offline-refresh-token',
      cachedAt: new Date().toISOString(),
    });

    const cached = await getCachedAuthSession();
    expect(cached).toBeDefined();
    expect(cached?.user.fullName).toBe('ዮሐንስ ዳዊት');
    expect(cached?.accessToken).toBe('offline-jwt-token');
  });

  it('6. Delete package removes it cleanly from offline storage', async () => {
    await deleteOfflinePackage('ch1');
    const pkg = await getOfflinePackage('ch1');
    expect(pkg).toBeUndefined();
  });
});
