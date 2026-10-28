import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { LearningPackageManifestSchema } from '@eotc/shared';

describe('Senior QA End-to-End Test Suite — Positive & Negative Scenarios, Boundaries, and Integrity Guards', () => {
  const app = createApp();

  const ADMIN_EMAIL = 'admin@eotc-andnet.org';
  const ADMIN_PASS = 'AdminSecurePassword2026!';

  const STUDENT_EMAIL = 'student@eotc-andnet.org';
  const STUDENT_PASS = 'StudentPassword2026!';

  let adminToken: string;
  let studentToken: string;
  let studentUserId: string;

  // Test Curriculum IDs (Grade 10)
  let qaGradeId: string;
  let qaSubjectId: string;
  let qaChapterId: string;
  let qaQuizId: string;
  let qaQ1Id: string;
  let qaQ1ChoiceCorrectId: string;
  let qaQ1ChoiceWrongId: string;
  let qaQ2Id: string;
  let qaQ2ChoiceCorrectId: string;

  const TEST_USER_EMAIL = 'qa-deactivated-user@eotc-andnet.org';

  beforeAll(async () => {
    // 1. Cleanup any test artifacts
    await prisma.grade.deleteMany({ where: { level: 10 } });
    await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });

    // 2. Admin Login
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    // 3. Student Login
    const studentLogin = await request(app).post('/api/auth/login').send({
      email: STUDENT_EMAIL,
      password: STUDENT_PASS,
    });
    expect(studentLogin.status).toBe(200);
    studentToken = studentLogin.body.data.tokens.accessToken;
    studentUserId = studentLogin.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.grade.deleteMany({ where: { level: 10 } });
    await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. AUTHENTICATION & SECURITY BOUNDARIES (NEGATIVE SCENARIOS)
  // =========================================================================
  describe('1. Authentication & Security Edge Cases', () => {
    it('1A: Login with non-existent email is rejected with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost-nonexistent@eotc.org',
        password: 'SomePassword123!',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('1B: Login with wrong password is rejected with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: 'IncorrectPassword999!',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('1C: Login with malformed email is rejected with 400 Bad Request', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
        password: 'ValidPassword123!',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('1D: Login with short password (< 6 chars) is rejected with 400 Bad Request', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: '12345',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('1E: Deactivated user is blocked from logging in with 403 Forbidden', async () => {
      // 1. Admin creates a user
      const createRes = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: TEST_USER_EMAIL,
          fullName: 'QA Inactive Student',
          password: 'Password123!',
          role: 'STUDENT',
        });
      expect(createRes.status).toBe(201);
      const testUserId = createRes.body.data.id;

      // 2. Admin deactivates the user
      const deactivateRes = await request(app)
        .patch(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(deactivateRes.status).toBe(200);

      // 3. User attempts to log in
      const loginRes = await request(app).post('/api/auth/login').send({
        email: TEST_USER_EMAIL,
        password: 'Password123!',
      });
      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    it('1F: Deactivated user access token is immediately rejected on subsequent requests (403)', async () => {
      // 1. Re-activate user
      const user = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
      expect(user).toBeDefined();

      await prisma.user.update({
        where: { id: user!.id },
        data: { isActive: true },
      });

      // 2. User logs in and gets access token
      const loginRes = await request(app).post('/api/auth/login').send({
        email: TEST_USER_EMAIL,
        password: 'Password123!',
      });
      expect(loginRes.status).toBe(200);
      const tempToken = loginRes.body.data.tokens.accessToken;

      // 3. User can initially access student endpoint
      const req1 = await request(app)
        .get('/api/student/curriculum')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(req1.status).toBe(200);

      // 4. Admin deactivates the user in database
      await prisma.user.update({
        where: { id: user!.id },
        data: { isActive: false },
      });

      // 5. Subsequent request with the same token is blocked by authenticate middleware
      const req2 = await request(app)
        .get('/api/student/curriculum')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(req2.status).toBe(403);
      expect(req2.body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    it('1G: Tampered JWT signature is rejected with 401 Unauthorized', async () => {
      const parts = studentToken.split('.');
      // Alter signature
      const tampered = `${parts[0]}.${parts[1]}.tamperedSignatureHere12345`;
      const res = await request(app)
        .get('/api/student/curriculum')
        .set('Authorization', `Bearer ${tampered}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  // =========================================================================
  // 2. CURRICULUM BOUNDARY VALIDATION & PRECONDITIONS (NEGATIVE SCENARIOS)
  // =========================================================================
  describe('2. Curriculum Clamping & Schema Boundary Tests', () => {
    it('2A: Grade level < 1 is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/admin/curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ level: 0, name: 'Invalid Grade 0' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('2B: Grade level > 12 is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/admin/curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ level: 13, name: 'Invalid Grade 13' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('2C: Admin creates valid Grade 10', async () => {
      const res = await request(app)
        .post('/api/admin/curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: 10,
          name: 'Grade 10 — Patrology & Church Councils',
          amharicName: 'ክፍል ፲ — ዜና አበውና ጉባኤያት',
          orderIndex: 10,
        });
      expect(res.status).toBe(201);
      qaGradeId = res.body.data.id;
    });

    it('2D: Duplicate Grade level 10 creation is rejected with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/admin/curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: 10,
          name: 'Duplicate Grade 10',
        });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('GRADE_EXISTS');
    });

    it('2E: Admin creates Subject and rejects duplicate subject code', async () => {
      const res1 = await request(app)
        .post(`/api/admin/curriculum/grades/${qaGradeId}/subjects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Patrology',
          amharicName: 'ዜና አበው',
          code: 'PATRO10',
          orderIndex: 1,
        });
      expect(res1.status).toBe(201);
      qaSubjectId = res1.body.data.id;

      // Duplicate code under same grade
      const res2 = await request(app)
        .post(`/api/admin/curriculum/grades/${qaGradeId}/subjects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Patrology',
          code: 'PATRO10',
        });
      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('SUBJECT_EXISTS');
    });

    it('2F: Admin creates Chapter under Subject', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/subjects/${qaSubjectId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          chapterNumber: 1,
          title: 'Chapter 1: The Council of Nicaea',
          amharicTitle: 'ምዕራፍ ፩: የኒቂያ ጉባኤ',
          orderIndex: 1,
        });
      expect(res.status).toBe(201);
      qaChapterId = res.body.data.id;
    });

    it('2G: Textbook Clamping: startPage > endPage is rejected with 400', async () => {
      const res = await request(app)
        .put(`/api/admin/curriculum/chapters/${qaChapterId}/textbook`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Patrology Textbook',
          fileUrl: 'https://res.cloudinary.com/eotc/patrology.pdf',
          fileSize: 1048576,
          checksumSha256: 'sha256-hash',
          mimeType: 'application/pdf',
          startPage: 45,
          endPage: 20, // Invalid: endPage < startPage
          totalPages: 100,
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('2H: Textbook Clamping: endPage > totalPages is rejected with 400', async () => {
      const res = await request(app)
        .put(`/api/admin/curriculum/chapters/${qaChapterId}/textbook`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Patrology Textbook',
          fileUrl: 'https://res.cloudinary.com/eotc/patrology.pdf',
          fileSize: 1048576,
          checksumSha256: 'sha256-hash',
          mimeType: 'application/pdf',
          startPage: 1,
          endPage: 150, // Invalid: totalPages is only 100
          totalPages: 100,
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('2I: Textbook Clamping: non-positive page numbers rejected with 400', async () => {
      const res = await request(app)
        .put(`/api/admin/curriculum/chapters/${qaChapterId}/textbook`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Patrology Textbook',
          fileUrl: 'https://res.cloudinary.com/eotc/patrology.pdf',
          fileSize: 1048576,
          checksumSha256: 'sha256-hash',
          mimeType: 'application/pdf',
          startPage: 0, // Invalid: must be >= 1
          endPage: 10,
          totalPages: 100,
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('2J: Publishing an unconfigured chapter is rejected (precondition: missing textbook)', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/chapters/${qaChapterId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PUBLISH_PRECONDITION_FAILED');
      expect(res.body.error.message).toContain('textbook');
    });

    it('2K: Admin configures valid clamped textbook [1..30 of 120]', async () => {
      const res = await request(app)
        .put(`/api/admin/curriculum/chapters/${qaChapterId}/textbook`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Patrology Grade 10',
          fileUrl: 'https://res.cloudinary.com/eotc/patro10.pdf',
          fileSize: 2097152,
          checksumSha256: 'qa-valid-textbook-hash-sha256',
          mimeType: 'application/pdf',
          startPage: 1,
          endPage: 30,
          totalPages: 120,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.startPage).toBe(1);
      expect(res.body.data.endPage).toBe(30);
    });

    it('2L: Publishing chapter with textbook but NO quiz is allowed (quiz is optional)', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/chapters/${qaChapterId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.manifest).toBeDefined();
    });

    it('2M: Question creation with NO correct choice is rejected with 400', async () => {
      // 1. Create quiz
      const qRes = await request(app)
        .post(`/api/admin/curriculum/chapters/${qaChapterId}/quizzes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Nicaea Council Quiz',
          passingScore: 70,
        });
      expect(qRes.status).toBe(201);
      qaQuizId = qRes.body.data.id;

      // 2. Attempt question where all choices are isCorrect: false
      const quesRes = await request(app)
        .post(`/api/admin/curriculum/quizzes/${qaQuizId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          prompt: 'Where was Nicaea located?',
          points: 10,
          choices: [
            { text: 'In Rome', isCorrect: false, orderIndex: 1 },
            { text: 'In Egypt', isCorrect: false, orderIndex: 2 },
          ],
        });
      expect(quesRes.status).toBe(400);
      expect(quesRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('2N: Admin adds 2 valid questions to quiz and publishes chapter', async () => {
      // Question 1 (10 pts)
      const q1 = await request(app)
        .post(`/api/admin/curriculum/quizzes/${qaQuizId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          prompt: 'In which year was the First Ecumenical Council of Nicaea convened?',
          amharicPrompt: 'የመጀመሪያው የኒቂያ ጉባኤ የተካሄደው በየትኛው ዓመተ ምሕረት ነበር?',
          points: 10,
          choices: [
            { text: '325 A.D.', amharicText: '፫፻፳፭ ዓ.ም.', isCorrect: true, orderIndex: 1 },
            { text: '451 A.D.', amharicText: '፬፻፶፩ ዓ.ም.', isCorrect: false, orderIndex: 2 },
          ],
        });
      expect(q1.status).toBe(201);
      qaQ1Id = q1.body.data.id;
      qaQ1ChoiceCorrectId = q1.body.data.choices.find((c: any) => c.isCorrect).id;
      qaQ1ChoiceWrongId = q1.body.data.choices.find((c: any) => !c.isCorrect).id;

      // Question 2 (10 pts)
      const q2 = await request(app)
        .post(`/api/admin/curriculum/quizzes/${qaQuizId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          prompt: 'How many holy fathers gathered at the Council of Nicaea?',
          amharicPrompt: 'በኒቂያ ጉባኤ የተሰበሰቡት ቅዱሳን አበው ስንት ነበሩ?',
          points: 10,
          choices: [
            { text: '318 Fathers', amharicText: '፫፻፲፰ ርቱዓነ ሃይማኖት', isCorrect: true, orderIndex: 1 },
            { text: '150 Fathers', amharicText: '፩፻፶ አበው', isCorrect: false, orderIndex: 2 },
          ],
        });
      expect(q2.status).toBe(201);
      qaQ2Id = q2.body.data.id;
      qaQ2ChoiceCorrectId = q2.body.data.choices.find((c: any) => c.isCorrect).id;

      // Now publish successfully!
      const pubRes = await request(app)
        .post(`/api/admin/curriculum/chapters/${qaChapterId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.manifest).toBeDefined();
      expect(pubRes.body.data.manifest.version).toBe(3);
    });
  });

  // =========================================================================
  // 3. SERVER SCORING TRUTH & SYNC ENGINE INTEGRITY (POSITIVE & NEGATIVE)
  // =========================================================================
  describe('3. Sync Engine Idempotency & Score Verification Tests', () => {
    it('3A: Server recalculates score regardless of student client-reported claims', async () => {
      const attemptUuid = 'ca000000-0000-4000-8000-000000000001';

      // Student falsely claims score 100 and passed=true, but only answered Q1 correctly and Q2 wrong
      const res = await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [
            {
              clientAttemptUuid: attemptUuid,
              quizId: qaQuizId,
              quizVersion: 1,
              startedAt: new Date(Date.now() - 60000).toISOString(),
              completedAt: new Date().toISOString(),
              score: 20, // Claimed full 20 pts
              maxScore: 20,
              passed: true, // Claimed passed
              answers: [
                { questionId: qaQ1Id, selectedChoiceId: qaQ1ChoiceCorrectId }, // Correct (+10)
                { questionId: qaQ2Id, selectedChoiceId: 'invalid-choice-id' }, // Wrong/bogus choice (+0)
              ],
            },
          ],
          progress: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.syncedCount).toBe(1);
      const result = res.body.data.results[0];
      // Total max is 20, user earned 10 pts (50%). Passing score is 70% -> failed!
      expect(result.validatedScore).toBe(10);
      expect(result.passed).toBe(false);

      // Verify database record matches server calculation, NOT client claims
      const savedAttempt = await prisma.quizAttempt.findUnique({
        where: { clientAttemptUuid: attemptUuid },
      });
      expect(savedAttempt).toBeDefined();
      expect(savedAttempt!.score).toBe(10);
      expect(savedAttempt!.passed).toBe(false);
    });

    it('3B: Attempt for non-existent quiz ID is rejected gracefully without failing batch', async () => {
      const attemptUuid = 'ca000000-0000-4000-8000-000000000002';
      const res = await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [
            {
              clientAttemptUuid: attemptUuid,
              quizId: 'non-existent-quiz-c7d8e9f0',
              quizVersion: 1,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              score: 10,
              maxScore: 10,
              passed: true,
              answers: [],
            },
          ],
          progress: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.failedCount).toBe(1);
      expect(res.body.data.results[0].status).toBe('REJECTED');
      expect(res.body.data.results[0].message).toContain('not found');
    });

    it('3C: Submitting identical clientAttemptUuid in the same batch handles duplicate safely', async () => {
      const sharedUuid = 'ca000000-0000-4000-8000-000000000003';

      const res = await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [
            {
              clientAttemptUuid: sharedUuid,
              quizId: qaQuizId,
              quizVersion: 1,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              score: 20,
              maxScore: 20,
              passed: true,
              answers: [
                { questionId: qaQ1Id, selectedChoiceId: qaQ1ChoiceCorrectId },
                { questionId: qaQ2Id, selectedChoiceId: qaQ2ChoiceCorrectId },
              ],
            },
            // Duplicate item in same payload
            {
              clientAttemptUuid: sharedUuid,
              quizId: qaQuizId,
              quizVersion: 1,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              score: 20,
              maxScore: 20,
              passed: true,
              answers: [],
            },
          ],
          progress: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBe(2);
      expect(res.body.data.results[0].status).toBe('SYNCED');
      expect(res.body.data.results[1].status).toBe('DUPLICATE');

      // Verify exactly ONE database record exists
      const count = await prisma.quizAttempt.count({
        where: { clientAttemptUuid: sharedUuid },
      });
      expect(count).toBe(1);
    });

    it('3D: Student Progress Last-Write-Wins: Out-of-order study timestamp does not regress page progress', async () => {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 600000);
      const oneHourAgo = new Date(now.getTime() - 3600000);

      // 1. Initial progress: Page 12 at 10 minutes ago
      await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [],
          progress: [
            {
              chapterId: qaChapterId,
              isCompleted: false,
              lastReadPage: 12,
              lastStudiedAt: tenMinutesAgo.toISOString(),
            },
          ],
        });

      // 2. Later update: Page 28 at now (chapter completed)
      await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [],
          progress: [
            {
              chapterId: qaChapterId,
              isCompleted: true,
              lastReadPage: 28,
              lastStudiedAt: now.toISOString(),
            },
          ],
        });

      // 3. Stale update arrives from old offline device: Page 5 at one hour ago
      await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [],
          progress: [
            {
              chapterId: qaChapterId,
              isCompleted: false,
              lastReadPage: 5,
              lastStudiedAt: oneHourAgo.toISOString(),
            },
          ],
        });

      // 4. Verify progress did NOT regress
      const progress = await prisma.studentProgress.findUnique({
        where: {
          userId_chapterId: { userId: studentUserId, chapterId: qaChapterId },
        },
      });
      expect(progress).toBeDefined();
      expect(progress!.lastReadPage).toBe(28);
      expect(progress!.isCompleted).toBe(true);
    });

    it('3E: Malformed clientAttemptUuid (non-UUID) is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [
            {
              clientAttemptUuid: '12345-not-a-uuid',
              quizId: qaQuizId,
              quizVersion: 1,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              score: 10,
              maxScore: 10,
              passed: true,
              answers: [],
            },
          ],
          progress: [],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('3F: Future cursor pull (/api/student/sync/pull) returns empty delta lists', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .get(`/api/student/sync/pull?since=${future}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.attempts.length).toBe(0);
      expect(res.body.data.progress.length).toBe(0);
    });
  });
});
