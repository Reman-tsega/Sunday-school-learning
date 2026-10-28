import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemorySqliteDb } from './mockSqlite';
import { createMockFileSystem } from './mockFileSystem';
import type { ISqliteDb } from '../src/database/sqliteDb';
import {
  packageRepository,
  quizAttemptRepository,
  studentProgressRepository,
  authSessionRepository,
} from '../src/database/sqliteDb';
import {
  downloadLearningPackage,
  deleteLearningPackage,
} from '../src/services/downloadManager';
import {
  evaluateQuizOffline,
  saveOfflineQuizAttempt,
} from '../src/services/quizService';
import {
  reconstructCurriculumFromLocalPackages,
} from '../src/services/api';
import type { LearningPackageManifest, OfflineQuiz } from '@eotc/shared';
import type { OfflinePackageRecord } from '../src/types';

describe('EOTC Mobile App — Offline Architecture & Storage Test Suite', () => {
  let db: ISqliteDb;
  let fs: ReturnType<typeof createMockFileSystem>;

  const mockManifest: LearningPackageManifest = {
    packageId: 'pkg-ch1-v1',
    chapterId: 'chapter-1',
    chapterNumber: 1,
    chapterTitle: 'ምዕራፍ 1: የሐዋርያት ጉባኤ በኢየሩሳሌም',
    amharicChapterTitle: 'የሐዋርያት ጉባኤ በኢየሩሳሌም',
    subjectId: 'subject-church-history',
    subjectName: 'የቤተ ክርስቲያን ታሪክ',
    amharicSubjectName: 'የቤተ ክርስቲያን ታሪክ',
    gradeLevel: 7,
    gradeName: '7ኛ ክፍል (Grade 7)',
    version: 1,
    publishedAt: new Date().toISOString(),
    checksumSha256: 'mock-sha256-checksum-chapter-1',
    totalSizeBytes: 4194304,
    textbook: {
      id: 'doc-hist7-pdf',
      title: 'የ7ኛ ክፍል የቤተ ክርስቲያን ታሪክ መማሪያ',
      fileUrl: 'https://res.cloudinary.com/eotc/raw/upload/v1/textbooks/hist7.pdf',
      fileSize: 4194304,
      checksumSha256: 'abc123sha256',
      mimeType: 'application/pdf',
      startPage: 5,
      endPage: 12,
      totalPages: 120,
    },
    quizzes: [
      {
        id: 'quiz-ch1',
        title: 'የምዕራፍ 1 የልምምድ ፈተና',
        amharicTitle: 'የምዕራፍ 1 የልምምድ ፈተና',
        description: 'ጥያቄዎቹን በጥሞና አንብበው ትክክለኛውን መልስ ይምረጡ።',
        passingScore: 75,
        isPractice: true,
        version: 1,
        questions: [
          {
            id: 'q1',
            prompt: 'የመጀመሪያው የሐዋርያት ሲኖዶስ የተደረገው የት ነው?',
            orderIndex: 1,
            points: 10,
            explanation: 'የሐዋርያት ጉባኤ በኢየሩሳሌም በሐዋርያት ሥራ ምዕራፍ 15 ተመዝግቧል።',
            choices: [
              { id: 'c1-a', text: 'በአንጾኪያ', orderIndex: 1, isCorrect: false },
              { id: 'c1-b', text: 'በኢየሩሳሌም', orderIndex: 2, isCorrect: true },
              { id: 'c1-c', text: 'በሮም', orderIndex: 3, isCorrect: false },
            ],
          },
          {
            id: 'q2',
            prompt: 'የሐዋርያት ጉባኤ የተደረገበት ዋናው ምክንያት ምን ነበር?',
            orderIndex: 2,
            points: 10,
            explanation: 'በአሕዛብ ክርስቲያኖች ላይ የኦሪትን ግዝረት መጫን እንደማይገባ ተወስኗል።',
            choices: [
              { id: 'c2-a', text: 'ስለ አሕዛብ መዳንና የኦሪት ሥርዓት', orderIndex: 1, isCorrect: true },
              { id: 'c2-b', text: 'ስለ አዲስ ቤተ መቅደስ ግንባታ', orderIndex: 2, isCorrect: false },
            ],
          },
        ],
      },
    ],
    references: [
      {
        id: 'ref-1',
        title: 'የሐዋርያት ሥራ ምዕራፍ 15 ንባብ',
        url: 'https://eotc.org/acts15.pdf',
        isDownloadable: true,
        downloadableDocUrl: 'https://eotc.org/acts15.pdf',
        downloadableDocSize: 524288,
        downloadableDocChecksum: 'ref1sha256',
      },
      {
        id: 'ref-2',
        title: 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ታሪክ ድረ-ገጽ',
        url: 'https://eotcpatron.org/history',
        isDownloadable: false,
      },
    ],
  };

  beforeEach(async () => {
    db = await createInMemorySqliteDb();
    fs = createMockFileSystem();
  });

  describe('1. SQLite Database & Schema Repositories', () => {
    it('creates all tables and allows inserting/querying package records', async () => {
      const record: OfflinePackageRecord = {
        chapterId: 'chapter-1',
        subjectId: 'subject-church-history',
        gradeId: 'grade-7',
        title: 'ምዕራፍ 1',
        version: 1,
        manifest: mockManifest,
        localPdfUri: 'file:///data/packages/chapter-1/textbook.pdf',
        downloadStatus: 'AVAILABLE_OFFLINE',
        downloadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await packageRepository.savePackage(db, record);
      const retrieved = await packageRepository.getPackage(db, 'chapter-1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.chapterId).toBe('chapter-1');
      expect(retrieved?.downloadStatus).toBe('AVAILABLE_OFFLINE');
      expect(retrieved?.manifest.chapterTitle).toBe(mockManifest.chapterTitle);
      expect(retrieved?.manifest.quizzes[0]?.questions.length).toBe(2);
    });

    it('updates existing package record when updated', async () => {
      const record: OfflinePackageRecord = {
        chapterId: 'chapter-1',
        subjectId: 'subject-church-history',
        gradeId: 'grade-7',
        title: 'ምዕራፍ 1',
        version: 1,
        manifest: mockManifest,
        localPdfUri: null,
        downloadStatus: 'DOWNLOADING',
        downloadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await packageRepository.savePackage(db, record);

      const updatedRecord: OfflinePackageRecord = {
        ...record,
        version: 2,
        downloadStatus: 'AVAILABLE_OFFLINE',
        localPdfUri: 'file:///data/packages/chapter-1/textbook.pdf',
      };
      await packageRepository.savePackage(db, updatedRecord);

      const retrieved = await packageRepository.getPackage(db, 'chapter-1');
      expect(retrieved?.version).toBe(2);
      expect(retrieved?.downloadStatus).toBe('AVAILABLE_OFFLINE');
      expect(retrieved?.localPdfUri).toBe('file:///data/packages/chapter-1/textbook.pdf');
    });

    it('deletes package from database cleanly', async () => {
      await packageRepository.savePackage(db, {
        chapterId: 'chapter-del',
        subjectId: 'sub-1',
        gradeId: 'gr-1',
        title: 'To Delete',
        version: 1,
        manifest: mockManifest,
        localPdfUri: null,
        downloadStatus: 'AVAILABLE_OFFLINE',
        downloadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(await packageRepository.getPackage(db, 'chapter-del')).not.toBeNull();
      await packageRepository.deletePackage(db, 'chapter-del');
      expect(await packageRepository.getPackage(db, 'chapter-del')).toBeNull();
    });
  });

  describe('2. Native Download Manager & 5-Step Verification', () => {
    it('executes 5-step verification and commits AVAILABLE_OFFLINE package', async () => {
      const progressSteps: string[] = [];
      const onProgress = (step: string) => progressSteps.push(step);

      const pkg = await downloadLearningPackage(db, fs, mockManifest, onProgress);

      expect(pkg.downloadStatus).toBe('AVAILABLE_OFFLINE');
      expect(pkg.localPdfUri).toContain('textbook.pdf');

      // Verify file exists on local mock filesystem
      const info = await fs.getInfoAsync(pkg.localPdfUri!);
      expect(info.exists).toBe(true);
      expect(info.size).toBeGreaterThan(0);

      // Verify reference file downloaded
      const refUri = `${fs.documentDirectory}packages/chapter-1/refs/ref-1.pdf`;
      const refInfo = await fs.getInfoAsync(refUri);
      expect(refInfo.exists).toBe(true);
      expect(refInfo.size).toBeGreaterThan(0);

      // Verify saved in SQLite
      const inDb = await packageRepository.getPackage(db, 'chapter-1');
      expect(inDb?.downloadStatus).toBe('AVAILABLE_OFFLINE');
      expect(progressSteps.length).toBeGreaterThan(3);
    });

    it('marks package as FAILED and rolls back on download error', async () => {
      const brokenManifest: LearningPackageManifest = {
        ...mockManifest,
        chapterId: 'chapter-error',
        chapterTitle: 'Error Chapter',
        textbook: {
          ...mockManifest.textbook,
          fileUrl: 'https://example.com/error-fail-download/textbook.pdf',
        },
      };

      await expect(downloadLearningPackage(db, fs, brokenManifest)).rejects.toThrow();

      const inDb = await packageRepository.getPackage(db, 'chapter-error');
      expect(inDb).not.toBeNull();
      expect(inDb?.downloadStatus).toBe('FAILED');
    });

    it('deletes package files and SQLite record upon request', async () => {
      await downloadLearningPackage(db, fs, mockManifest);
      expect(await packageRepository.getPackage(db, 'chapter-1')).not.toBeNull();

      await deleteLearningPackage(db, fs, 'chapter-1');
      expect(await packageRepository.getPackage(db, 'chapter-1')).toBeNull();

      const info = await fs.getInfoAsync(
        `${fs.documentDirectory}packages/chapter-1/textbook.pdf`
      );
      expect(info.exists).toBe(false);
    });
  });

  describe('3. Offline Practice Quiz Evaluation & Outbox Storage', () => {
    it('evaluates answers offline and awards 100% when all choices match answer key', () => {
      const quiz: OfflineQuiz = mockManifest.quizzes[0]!;
      const userAnswers = {
        q1: 'c1-b', // correct
        q2: 'c2-a', // correct
      };

      const result = evaluateQuizOffline(quiz, userAnswers);

      expect(result.score).toBe(20);
      expect(result.maxScore).toBe(20);
      expect(result.scorePercent).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.clientAttemptUuid).toBeDefined();
      expect(result.questionResults[0]?.isCorrect).toBe(true);
      expect(result.questionResults[1]?.isCorrect).toBe(true);
    });

    it('evaluates failed attempt when answers fall below passing threshold', () => {
      const quiz: OfflineQuiz = mockManifest.quizzes[0]!;
      const userAnswers = {
        q1: 'c1-a', // wrong
        q2: 'c2-b', // wrong
      };

      const result = evaluateQuizOffline(quiz, userAnswers);

      expect(result.score).toBe(0);
      expect(result.scorePercent).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('saves quiz attempt to SQLite outbox with PENDING sync state', async () => {
      const attempt = await saveOfflineQuizAttempt(db, {
        quizId: 'quiz-ch1',
        chapterId: 'chapter-1',
        score: 20,
        maxScore: 20,
        passed: true,
        answers: [
          { questionId: 'q1', selectedChoiceId: 'c1-b', isCorrect: true, pointsEarned: 10 },
          { questionId: 'q2', selectedChoiceId: 'c2-a', isCorrect: true, pointsEarned: 10 },
        ],
      });

      expect(attempt.clientAttemptUuid).toBeDefined();
      expect(attempt.syncState).toBe('PENDING');

      const history = await quizAttemptRepository.getAttemptsByChapter(db, 'chapter-1');
      expect(history.length).toBe(1);
      expect(history[0]?.score).toBe(20);
      expect(history[0]?.passed).toBe(true);

      const pending = await quizAttemptRepository.getPendingSyncAttempts(db);
      expect(pending.length).toBe(1);
      expect(pending[0]?.clientAttemptUuid).toBe(attempt.clientAttemptUuid);
    });

    it('allows retaking quiz and preserves multiple attempts in SQLite', async () => {
      await saveOfflineQuizAttempt(db, {
        quizId: 'quiz-ch1',
        chapterId: 'chapter-1',
        score: 10,
        maxScore: 20,
        passed: false,
        answers: [{ questionId: 'q1', selectedChoiceId: 'c1-a' }],
      });

      await saveOfflineQuizAttempt(db, {
        quizId: 'quiz-ch1',
        chapterId: 'chapter-1',
        score: 20,
        maxScore: 20,
        passed: true,
        answers: [{ questionId: 'q1', selectedChoiceId: 'c1-b' }],
      });

      const history = await quizAttemptRepository.getAttemptsByChapter(db, 'chapter-1');
      expect(history.length).toBe(2);
    });

    it('marks attempt as SYNCED when server confirms sync', async () => {
      const attempt = await saveOfflineQuizAttempt(db, {
        quizId: 'quiz-ch1',
        chapterId: 'chapter-1',
        score: 20,
        maxScore: 20,
        passed: true,
        answers: [],
      });

      const syncTime = new Date().toISOString();
      await quizAttemptRepository.markAttemptSynced(db, attempt.clientAttemptUuid, syncTime);

      const pending = await quizAttemptRepository.getPendingSyncAttempts(db);
      expect(pending.length).toBe(0);

      const history = await quizAttemptRepository.getAttemptsByChapter(db, 'chapter-1');
      expect(history[0]?.syncState).toBe('SYNCED');
      expect(history[0]?.syncedAt).toBe(syncTime);
    });
  });

  describe('4. Student Reading Progress Persistence', () => {
    it('saves and updates reading progress for chapter', async () => {
      await studentProgressRepository.saveProgress(db, 'chapter-1', 7, false, 60);

      let progress = await studentProgressRepository.getProgress(db, 'chapter-1');
      expect(progress?.lastReadPage).toBe(7);
      expect(progress?.isCompleted).toBe(false);
      expect(progress?.timeSpentSeconds).toBe(60);

      await studentProgressRepository.saveProgress(db, 'chapter-1', 12, true, 45);

      progress = await studentProgressRepository.getProgress(db, 'chapter-1');
      expect(progress?.lastReadPage).toBe(12);
      expect(progress?.isCompleted).toBe(true);
      expect(progress?.timeSpentSeconds).toBe(105);
    });
  });

  describe('5. Auth Session SQLite Caching', () => {
    it('persists student auth session and retrieves it for offline login', async () => {
      await authSessionRepository.saveSession(db, {
        id: 'current_session',
        studentId: 'student-uuid-1',
        email: 'student@eotc.org',
        fullName: 'ተማሪ ዮሐንስ (Student Yohannes)',
        role: 'STUDENT',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        cachedAt: new Date().toISOString(),
      });

      const session = await authSessionRepository.getSession(db);
      expect(session).not.toBeNull();
      expect(session?.email).toBe('student@eotc.org');
      expect(session?.fullName).toBe('ተማሪ ዮሐንስ (Student Yohannes)');

      await authSessionRepository.clearSession(db);
      expect(await authSessionRepository.getSession(db)).toBeNull();
    });
  });

  describe('6. Offline Curriculum Hierarchy Reconstruction', () => {
    it('reconstructs complete Grade -> Subject -> Chapter hierarchy from local SQLite packages', () => {
      const localPkgs = [
        {
          chapterId: 'chapter-1',
          subjectId: 'subject-church-history',
          gradeId: 'grade-7',
          title: 'ምዕራፍ 1: የሐዋርያት ጉባኤ',
          manifest: mockManifest,
          downloadStatus: 'AVAILABLE_OFFLINE',
        },
      ];

      const curriculum = reconstructCurriculumFromLocalPackages(localPkgs);

      expect(curriculum.length).toBe(1);
      expect(curriculum[0]?.name).toBe('7ኛ ክፍል (Grade 7)');
      expect(curriculum[0]?.subjects.length).toBe(1);
      expect(curriculum[0]?.subjects[0]?.name).toBe('የቤተ ክርስቲያን ታሪክ');
      expect(curriculum[0]?.subjects[0]?.chapters.length).toBe(1);
      expect(curriculum[0]?.subjects[0]?.chapters[0]?.isAvailableOffline).toBe(true);
    });
  });
});
