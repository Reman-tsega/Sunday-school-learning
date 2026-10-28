import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { LearningPackageManifestSchema } from '@eotc/shared';

describe('Phase 7 — End-to-End Verification & Full Lifecycle User Journey', () => {
  const app = createApp();

  const ADMIN_EMAIL = 'admin@eotc-andnet.org';
  const ADMIN_PASS = 'AdminSecurePassword2026!';

  const STUDENT_EMAIL = 'student@eotc-andnet.org';
  const STUDENT_PASS = 'StudentPassword2026!';

  let adminToken: string;
  let studentToken: string;
  let studentUserId: string;

  let createdGradeId: string;
  let createdSubjectId: string;
  let createdChapterId: string;
  let createdQuizId: string;
  let q1Id: string;
  let q1ChoiceCorrectId: string;

  const clientAttemptUuid = 'e2e00000-1111-4222-8333-444444444444';

  beforeAll(async () => {
    // 1. Cleanup any test artifacts
    await prisma.grade.deleteMany({ where: { level: { in: [11, 88] } } });

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
    await prisma.grade.deleteMany({ where: { level: { in: [11, 88] } } });
    await prisma.$disconnect();
  });

  // =========================================================================
  // JOURNEY 1: ADMIN CURRICULUM AUTHORING & PUBLISHING WORKFLOW
  // =========================================================================
  describe('Journey 1: Administrator Curriculum Authoring & Package Publication', () => {
    it('Step 1: Admin creates Grade 11 for EOTC curriculum', async () => {
      const res = await request(app)
        .post('/api/admin/curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: 11,
          name: 'Grade 11 — Christian Ethics',
          amharicName: 'ክፍል ፲፩ — ክርስቲያናዊ ሥነ ምግባር',
          description: 'የክርስቲያናዊ ሥነ ምግባር ትምህርት',
          orderIndex: 11,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdGradeId = res.body.data.id;
    });

    it('Step 2: Admin creates Subject under Grade 11', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/grades/${createdGradeId}/subjects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Christian Ethics',
          amharicName: 'ክርስቲያናዊ ሥነ ምግባር',
          code: 'ETHICS11',
          description: 'ትምህርተ ክርስቲያን እና ሥነ ምግባር',
          orderIndex: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdSubjectId = res.body.data.id;
    });

    it('Step 3: Admin creates Chapter under Subject', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/subjects/${createdSubjectId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          chapterNumber: 1,
          title: 'Chapter 1: The Foundations of Christian Ethics',
          amharicTitle: 'ምዕራፍ ፩: የክርስቲያናዊ ሥነ ምግባር መሠረቶች',
          description: 'በሃይማኖትና በምግባር መኖር',
          orderIndex: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdChapterId = res.body.data.id;
    });

    it('Step 4: Admin attaches textbook PDF with strictly clamped page range [12..28]', async () => {
      const res = await request(app)
        .put(`/api/admin/curriculum/chapters/${createdChapterId}/textbook`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'የ11ኛ ክፍል ክርስቲያናዊ ሥነ ምግባር መማሪያ',
          fileUrl: 'https://res.cloudinary.com/eotc/raw/upload/v1/textbooks/ethics11.pdf',
          fileSize: 6291456, // 6 MB
          checksumSha256: 'e2e-sha256-textbook-hash',
          mimeType: 'application/pdf',
          startPage: 12,
          endPage: 28,
          totalPages: 150,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.startPage).toBe(12);
      expect(res.body.data.endPage).toBe(28);
    });

    it('Step 5: Admin creates practice quiz', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/chapters/${createdChapterId}/quizzes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'የምዕራፍ ፩ የልምምድ ፈተና',
          amharicTitle: 'የልምምድ ፈተና',
          description: 'ጥያቄዎቹን በጥሞና አንብበው ትክክለኛውን መልስ ይምረጡ።',
          passingScore: 75,
          isPractice: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdQuizId = res.body.data.id;
    });

    it('Step 6: Admin adds questions and choices to quiz', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/quizzes/${createdQuizId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          prompt: 'ክርስቲያናዊ ሥነ ምግባር ከየት ይመነጫል?',
          amharicPrompt: 'ክርስቲያናዊ ሥነ ምግባር ከየት ይመነጫል?',
          points: 10,
          orderIndex: 1,
          explanation: 'ሥነ ምግባር ከቅዱስ ወንጌልና ከእግዚአብሔር ቃል ይመነጫል።',
          choices: [
            { text: 'ከሰው ልማድ ብቻ', isCorrect: false, orderIndex: 1 },
            { text: 'ከእግዚአብሔር ቃልና ከቀናች ሃይማኖት', isCorrect: true, orderIndex: 2 },
            { text: 'ከፍልስፍና ብቻ', isCorrect: false, orderIndex: 3 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      q1Id = res.body.data.id;
      q1ChoiceCorrectId = res.body.data.choices.find((c: any) => c.isCorrect).id;
    });

    it('Step 7: Admin attaches approved references (one offline PDF and one web link)', async () => {
      const ref1 = await request(app)
        .post(`/api/admin/curriculum/chapters/${createdChapterId}/references`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'የሥነ ምግባር መጽሐፍ ቅዱሳዊ ንባባት',
          url: 'https://eotc.org/refs/ethics-readings.pdf',
          isDownloadable: true,
          downloadableDocUrl: 'https://eotc.org/refs/ethics-readings.pdf',
          downloadableDocSize: 524288,
          downloadableDocChecksum: 'ref-pdf-checksum',
          orderIndex: 1,
        });
      expect(ref1.status).toBe(201);

      const ref2 = await request(app)
        .post(`/api/admin/curriculum/chapters/${createdChapterId}/references`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ቀኖና ድረ-ገጽ',
          url: 'https://eotcpatron.org/canons',
          isDownloadable: false,
          orderIndex: 2,
        });
      expect(ref2.status).toBe(201);
    });

    it('Step 8: Admin publishes chapter package producing verified LearningPackageManifest', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/chapters/${createdChapterId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.manifest).toBeDefined();

      const manifest = res.body.data.manifest;
      expect(manifest.version).toBeGreaterThanOrEqual(1);
      expect(manifest.chapterId).toBe(createdChapterId);
      expect(manifest.textbook.startPage).toBe(12);
      expect(manifest.textbook.endPage).toBe(28);
      expect(manifest.quizzes.length).toBe(1);
      expect(manifest.references.length).toBe(2);

      const parseResult = LearningPackageManifestSchema.safeParse(manifest);
      expect(parseResult.success).toBe(true);
    });
  });

  // =========================================================================
  // JOURNEY 2: STUDENT DISCOVERY & PACKAGE DOWNLOAD WORKFLOW
  // =========================================================================
  describe('Journey 2: Student Curriculum Discovery & Learning Package Retrieval', () => {
    it('Step 1: Student discovers curriculum including the newly published chapter', async () => {
      const res = await request(app)
        .get('/api/student/curriculum')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const grade = res.body.data.find((g: any) => g.level === 11);
      expect(grade).toBeDefined();
      expect(grade.subjects[0].chapters[0].id).toBe(createdChapterId);
    });

    it('Step 2: Student requests canonical learning package manifest for chapter', async () => {
      const res = await request(app)
        .get(`/api/student/packages/${createdChapterId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const manifest = res.body.data;
      expect(manifest.checksumSha256).toBeDefined();
      expect(manifest.textbook.fileSize).toBe(6291456);
      expect(manifest.quizzes[0].questions[0].choices.length).toBe(3);
    });
  });

  // =========================================================================
  // JOURNEY 3: AIRPLANE-MODE STUDY & IDEMPOTENT SYNCHRONIZATION
  // =========================================================================
  describe('Journey 3: Offline Study Simulation & Idempotent Sync Recovery', () => {
    it('Step 1: Student flushes offline attempt and reading progress via batch sync', async () => {
      const batchPayload = {
        attempts: [
          {
            clientAttemptUuid,
            quizId: createdQuizId,
            quizVersion: 1,
            startedAt: new Date(Date.now() - 180000).toISOString(),
            completedAt: new Date().toISOString(),
            score: 10,
            maxScore: 10,
            passed: true,
            clientDevice: 'Student-Tablet-E2E',
            isOffline: true,
            answers: [
              { questionId: q1Id, selectedChoiceId: q1ChoiceCorrectId },
            ],
          },
        ],
        progress: [
          {
            chapterId: createdChapterId,
            isCompleted: true,
            lastReadPage: 28,
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
      expect(res.body.data.syncedCount).toBe(1);
      expect(res.body.data.failedCount).toBe(0);
      expect(res.body.data.progressSynced).toBe(1);
      expect(res.body.data.results[0].status).toBe('SYNCED');
      expect(res.body.data.results[0].validatedScore).toBe(10);
      expect(res.body.data.results[0].passed).toBe(true);
    });

    it('Step 2: IDEMPOTENT RECOVERY: Retrying same batch after connection glitch produces zero duplicates', async () => {
      const res = await request(app)
        .post('/api/student/sync/batch')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attempts: [
            {
              clientAttemptUuid,
              quizId: createdQuizId,
              quizVersion: 1,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              score: 10,
              maxScore: 10,
              passed: true,
              clientDevice: 'Student-Tablet-E2E',
              isOffline: true,
              answers: [{ questionId: q1Id, selectedChoiceId: q1ChoiceCorrectId }],
            },
          ],
          progress: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.syncedCount).toBe(1);
      expect(res.body.data.results[0].status).toBe('DUPLICATE');
      expect(res.body.data.results[0].clientAttemptUuid).toBe(clientAttemptUuid);

      const attemptsCount = await prisma.quizAttempt.count({
        where: { clientAttemptUuid },
      });
      expect(attemptsCount).toBe(1);
    });

    it('Step 3: Multi-device pull (/api/student/sync/pull) returns saved attempt and progress', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString();

      const res = await request(app)
        .get(`/api/student/sync/pull?since=${pastTime}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const matchingAttempt = res.body.data.attempts.find(
        (a: any) => a.clientAttemptUuid === clientAttemptUuid
      );
      expect(matchingAttempt).toBeDefined();
      expect(matchingAttempt.score).toBe(10);
      expect(matchingAttempt.passed).toBe(true);

      const matchingProgress = res.body.data.progress.find(
        (p: any) => p.chapterId === createdChapterId
      );
      expect(matchingProgress).toBeDefined();
      expect(matchingProgress.lastReadPage).toBe(28);
      expect(matchingProgress.isCompleted).toBe(true);
    });
  });

  // =========================================================================
  // JOURNEY 4: PERMISSIONS, RBAC, AND SECURITY ENFORCEMENT
  // =========================================================================
  describe('Journey 4: Role-Based Access Control & Security Auditing', () => {
    it('Students cannot access administrative endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/admin/curriculum/grades')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ level: 99, name: 'Hacked Grade' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Unauthenticated requests are rejected with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/student/curriculum');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Invalid JWT signatures are rejected with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/student/curriculum')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Revoked refresh sessions cannot generate new tokens', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: STUDENT_EMAIL,
        password: STUDENT_PASS,
      });
      const refreshToken = login.body.data.tokens.refreshToken;

      const logout = await request(app).post('/api/auth/logout').send({ refreshToken });
      expect(logout.status).toBe(200);

      const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(refresh.status).toBe(401);
      expect(refresh.body.error.code).toBe('TOKEN_REUSE_DETECTED');
    });
  });
});
