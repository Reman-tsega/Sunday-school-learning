import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Phase 6 — Synchronization and Recovery Integration Tests', () => {
  const app = createApp();

  const STUDENT_EMAIL = 'student@eotc-andnet.org';
  const STUDENT_PASS = 'StudentPassword2026!';

  let studentToken: string;
  let studentUser: any;
  let testGradeId: string;
  let testSubjectId: string;
  let testChapterId: string;
  let testQuizId: string;
  let testQuestion1Id: string;
  let testChoice1CorrectId: string;
  let testChoice1WrongId: string;
  let testQuestion2Id: string;
  let testChoice2CorrectId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.grade.deleteMany({ where: { level: 99 } });

    // Login student
    const studentLogin = await request(app).post('/api/auth/login').send({
      email: STUDENT_EMAIL,
      password: STUDENT_PASS,
    });
    studentToken = studentLogin.body.data.tokens.accessToken;
    studentUser = studentLogin.body.data.user;

    // Create Grade, Subject, Chapter, Quiz with Questions and Choices
    const grade = await prisma.grade.create({
      data: {
        level: 99,
        name: 'Sync Test Grade',
        orderIndex: 99,
      },
    });
    testGradeId = grade.id;

    const subject = await prisma.subject.create({
      data: {
        gradeId: testGradeId,
        name: 'Sync Test Subject',
        code: 'SYNC99',
      },
    });
    testSubjectId = subject.id;

    const chapter = await prisma.chapter.create({
      data: {
        subjectId: testSubjectId,
        chapterNumber: 1,
        title: 'Sync Chapter 1',
        isPublished: true,
      },
    });
    testChapterId = chapter.id;

    const quiz = await prisma.quiz.create({
      data: {
        chapterId: testChapterId,
        title: 'Sync Practice Quiz',
        passingScore: 70,
        isPractice: true,
        isPublished: true,
        version: 1,
        questions: {
          create: [
            {
              prompt: 'Sync Question 1',
              points: 10,
              orderIndex: 1,
              choices: {
                create: [
                  { text: 'Correct Answer 1', isCorrect: true, orderIndex: 1 },
                  { text: 'Wrong Answer 1', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            {
              prompt: 'Sync Question 2',
              points: 10,
              orderIndex: 2,
              choices: {
                create: [
                  { text: 'Correct Answer 2', isCorrect: true, orderIndex: 1 },
                  { text: 'Wrong Answer 2', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
          ],
        },
      },
      include: {
        questions: {
          include: { choices: true },
        },
      },
    });
    testQuizId = quiz.id;

    const q1 = quiz.questions[0]!;
    testQuestion1Id = q1.id;
    testChoice1CorrectId = q1.choices.find((c) => c.isCorrect)!.id;
    testChoice1WrongId = q1.choices.find((c) => !c.isCorrect)!.id;

    const q2 = quiz.questions[1]!;
    testQuestion2Id = q2.id;
    testChoice2CorrectId = q2.choices.find((c) => c.isCorrect)!.id;
  });

  afterAll(async () => {
    await prisma.grade.deleteMany({ where: { level: 99 } });
    await prisma.$disconnect();
  });

  describe('1. Single Attempt Sync & Server-Side Scoring', () => {
    const attemptUuid = '11111111-2222-4333-8444-555555555555';

    it('successfully syncs a completed offline quiz attempt with server score validation', async () => {
      const payload = {
        clientAttemptUuid: attemptUuid,
        quizId: testQuizId,
        quizVersion: 1,
        startedAt: new Date(Date.now() - 300000).toISOString(),
        completedAt: new Date().toISOString(),
        score: 20, // claimed score
        maxScore: 20,
        passed: true,
        clientDevice: 'Android-Pixel-Test',
        isOffline: true,
        answers: [
          { questionId: testQuestion1Id, selectedChoiceId: testChoice1CorrectId },
          { questionId: testQuestion2Id, selectedChoiceId: testChoice2CorrectId },
        ],
      };

      const res = await request(app)
        .post('/api/student/quizzes/attempts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SYNCED');
      expect(res.body.data.clientAttemptUuid).toBe(attemptUuid);
      expect(res.body.data.serverAttemptId).toBeDefined();
      expect(res.body.data.validatedScore).toBe(20);
      expect(res.body.data.passed).toBe(true);

      // Verify row exists in DB
      const inDb = await prisma.quizAttempt.findUnique({
        where: { clientAttemptUuid: attemptUuid },
        include: { answers: true },
      });
      expect(inDb).not.toBeNull();
      expect(inDb?.score).toBe(20);
      expect(inDb?.answers.length).toBe(2);
    });

    it('IDEMPOTENCY: resending the exact same clientAttemptUuid returns DUPLICATE without creating new rows', async () => {
      const payload = {
        clientAttemptUuid: attemptUuid,
        quizId: testQuizId,
        quizVersion: 1,
        startedAt: new Date(Date.now() - 300000).toISOString(),
        completedAt: new Date().toISOString(),
        score: 20,
        maxScore: 20,
        passed: true,
        clientDevice: 'Android-Pixel-Test',
        isOffline: true,
        answers: [
          { questionId: testQuestion1Id, selectedChoiceId: testChoice1CorrectId },
        ],
      };

      const res = await request(app)
        .post('/api/student/quizzes/attempts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DUPLICATE');
      expect(res.body.data.clientAttemptUuid).toBe(attemptUuid);
      expect(res.body.data.message).toContain('already recorded idempotently');

      // Verify that NO duplicate row was created in DB
      const allRows = await prisma.quizAttempt.findMany({
        where: { clientAttemptUuid: attemptUuid },
      });
      expect(allRows.length).toBe(1);
    });
  });

  describe('2. Batch Synchronization Endpoint (Attempts + Reading Progress)', () => {
    const batchUuid1 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const batchUuid2 = 'ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee';

    it('processes batch containing multiple attempts and chapter reading progress', async () => {
      const batchPayload = {
        attempts: [
          {
            clientAttemptUuid: batchUuid1,
            quizId: testQuizId,
            quizVersion: 1,
            startedAt: new Date(Date.now() - 120000).toISOString(),
            completedAt: new Date().toISOString(),
            score: 10,
            maxScore: 20,
            passed: false,
            clientDevice: 'iOS-iPhone-Test',
            isOffline: true,
            answers: [
              { questionId: testQuestion1Id, selectedChoiceId: testChoice1CorrectId },
              { questionId: testQuestion2Id, selectedChoiceId: testChoice1WrongId }, // wrong choice
            ],
          },
          {
            clientAttemptUuid: batchUuid2,
            quizId: testQuizId,
            quizVersion: 1,
            startedAt: new Date(Date.now() - 60000).toISOString(),
            completedAt: new Date().toISOString(),
            score: 20,
            maxScore: 20,
            passed: true,
            clientDevice: 'iOS-iPhone-Test',
            isOffline: true,
            answers: [
              { questionId: testQuestion1Id, selectedChoiceId: testChoice1CorrectId },
              { questionId: testQuestion2Id, selectedChoiceId: testChoice2CorrectId },
            ],
          },
        ],
        progress: [
          {
            chapterId: testChapterId,
            isCompleted: false,
            lastReadPage: 7,
            lastStudiedAt: new Date().toISOString(),
          },
        ],
      };

      const res = await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(batchPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.syncedCount).toBe(2);
      expect(res.body.data.failedCount).toBe(0);
      expect(res.body.data.progressSynced).toBe(1);
      expect(res.body.data.results.length).toBe(2);

      // Verify progress saved in database
      const progress = await prisma.studentProgress.findUnique({
        where: {
          userId_chapterId: {
            userId: studentUser.id,
            chapterId: testChapterId,
          },
        },
      });
      expect(progress).not.toBeNull();
      expect(progress?.lastReadPage).toBe(7);
      expect(progress?.isCompleted).toBe(true);
    });

    it('handles duplicate attempts inside batch idempotently', async () => {
      const res = await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [
            {
              clientAttemptUuid: batchUuid1,
              quizId: testQuizId,
              quizVersion: 1,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              score: 10,
              maxScore: 20,
              passed: false,
              clientDevice: 'iOS-iPhone-Test',
              isOffline: true,
              answers: [],
            },
          ],
          progress: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.results[0].status).toBe('DUPLICATE');
      expect(res.body.data.syncedCount).toBe(1);
    });
  });

  describe('3. Student Progress Conflict Resolution (Last-Write-Wins)', () => {
    it('updates progress when incoming record has higher page or completion', async () => {
      const res = await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [],
          progress: [
            {
              chapterId: testChapterId,
              isCompleted: true,
              lastReadPage: 12,
              lastStudiedAt: new Date().toISOString(),
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.progressSynced).toBe(1);

      const progress = await prisma.studentProgress.findUnique({
        where: {
          userId_chapterId: {
            userId: studentUser.id,
            chapterId: testChapterId,
          },
        },
      });
      expect(progress?.lastReadPage).toBe(12);
      expect(progress?.isCompleted).toBe(true);
    });
  });

  describe('4. Cursor-Based Pull Updates Endpoint (/api/student/sync/pull)', () => {
    it('returns newly synced attempts and progress with server cursor', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString();

      const res = await request(app)
        .get(`/api/student/sync/pull?since=${pastTime}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.serverTime).toBeDefined();
      expect(res.body.data.attempts.length).toBeGreaterThan(0);
      expect(res.body.data.progress.length).toBeGreaterThan(0);
    });

    it('returns empty lists when since cursor is set in the future', async () => {
      const futureTime = new Date(Date.now() + 3600000).toISOString();

      const res = await request(app)
        .get(`/api/student/sync/pull?since=${futureTime}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.attempts.length).toBe(0);
      expect(res.body.data.progress.length).toBe(0);
    });
  });

  describe('5. Validation & Security Boundaries', () => {
    it('rejects attempt submission with invalid non-UUID string', async () => {
      const res = await request(app)
        .post('/api/student/quizzes/attempts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          clientAttemptUuid: 'invalid-non-uuid',
          quizId: testQuizId,
          quizVersion: 1,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          score: 10,
          maxScore: 20,
          passed: false,
          answers: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/student/sync/batch')
        .send({ attempts: [], progress: [] });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
