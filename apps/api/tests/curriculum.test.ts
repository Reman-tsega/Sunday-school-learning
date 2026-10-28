import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { LearningPackageManifestSchema } from '@eotc/shared';

describe('Phase 3 — Admin Curriculum, Publishing & Student Manifest Tests', () => {
  const app = createApp();

  const ADMIN_EMAIL = 'admin@eotc-andnet.org';
  const ADMIN_PASS = 'AdminSecurePassword2026!';

  const STUDENT_EMAIL = 'student@eotc-andnet.org';
  const STUDENT_PASS = 'StudentPassword2026!';

  let adminToken: string;
  let studentToken: string;

  let gradeId: string;
  let subjectId: string;
  let chapterId: string;
  let quizId: string;

  beforeAll(async () => {
    // 1. Clean up any previous test artifacts
    await prisma.grade.deleteMany({
      where: { level: 5 },
    });

    // 2. Obtain tokens
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
    });
    adminToken = adminLogin.body.data.tokens.accessToken;

    const studentLogin = await request(app).post('/api/auth/login').send({
      email: STUDENT_EMAIL,
      password: STUDENT_PASS,
    });
    studentToken = studentLogin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.grade.deleteMany({
      where: { level: 5 },
    });
    await prisma.$disconnect();
  });

  describe('1. Curriculum Creation Hierarchy (Grade -> Subject -> Chapter)', () => {
    it('Admin creates Grade 5', async () => {
      const res = await request(app)
        .post('/api/admin/curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: 5,
          name: 'Grade 5',
          amharicName: 'ክፍል ፭ (Grade 5)',
          description: 'አምስተኛ ደረጃ የሰንበት ትምህርት',
          orderIndex: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.level).toBe(5);
      gradeId = res.body.data.id;
    });

    it('Student cannot create a grade (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/admin/curriculum/grades')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          level: 6,
          name: 'Grade 6',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Admin creates Subject under Grade 5', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/grades/${gradeId}/subjects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Church History',
          amharicName: 'ታሪከ ቤተ ክርስቲያን',
          code: 'HIST-L5',
          description: 'የቤተ ክርስቲያን ታሪክ ከአበው ጀምሮ',
          orderIndex: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('HIST-L5');
      subjectId = res.body.data.id;
    });

    it('Admin creates Chapter 1 under Subject', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/subjects/${subjectId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          chapterNumber: 1,
          title: 'The Apostolic Era',
          amharicTitle: 'ምዕራፍ ፩: ዘመነ ሐዋርያት',
          description: 'የሐዋርያት ስብከት እና የመጀመሪያዋ ቤተ ክርስቲያን መስፋፋት',
          orderIndex: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.chapterNumber).toBe(1);
      expect(res.body.data.isPublished).toBe(false);
      chapterId = res.body.data.id;
    });

    it('Unpublished chapter is hidden from students in public curriculum browsing', async () => {
      const res = await request(app).get(`/api/curriculum/subjects/${subjectId}/chapters`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]); // Empty because not published
    });
  });

  describe('2. Textbook Upload & Page Range Configuration', () => {
    it('Publishing fails when textbook is missing', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/chapters/${chapterId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PUBLISH_PRECONDITION_FAILED');
      expect(res.body.error.message).toContain('No textbook PDF');
    });

    it('Rejects invalid page mapping (startPage > endPage)', async () => {
      const res = await request(app)
        .put(`/api/admin/curriculum/chapters/${chapterId}/textbook`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Church History Grade 5 Textbook',
          fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/history-g5.pdf',
          fileSize: 3145728,
          checksumSha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
          mimeType: 'application/pdf',
          startPage: 40,
          endPage: 20, // Invalid!
          totalPages: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Admin configures valid textbook and page mapping (pages 1-30 of 150)', async () => {
      const res = await request(app)
        .put(`/api/admin/curriculum/chapters/${chapterId}/textbook`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Church History Grade 5 Textbook',
          fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/history-g5.pdf',
          fileSize: 3145728,
          checksumSha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
          mimeType: 'application/pdf',
          startPage: 1,
          endPage: 30,
          totalPages: 150,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.startPage).toBe(1);
      expect(res.body.data.endPage).toBe(30);
      expect(res.body.data.totalPages).toBe(150);
    });
  });

  describe('3. Quiz, Questions & Reference Links Authoring', () => {
    it('Publishing chapter without quiz is allowed (quiz optional for reading-only)', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/chapters/${chapterId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.manifest).toBeDefined();
    });

    it('Admin creates Practice Quiz for Chapter 1', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/chapters/${chapterId}/quizzes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Apostolic Era Practice Quiz',
          amharicTitle: 'የዘመነ ሐዋርያት የልምምድ ፈተና',
          description: 'Practice quiz covering the missionary journeys and early church councils',
          timeLimitMinutes: 20,
          passingScore: 75,
          isPractice: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPractice).toBe(true);
      quizId = res.body.data.id;
    });

    it('Admin adds questions with multiple choices and answer keys', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/quizzes/${quizId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          prompt: 'Where did the Apostles receive the Holy Spirit on the day of Pentecost?',
          amharicPrompt: 'ሐዋርያት በመንፈስ ቅዱስ የወረደባቸው በዓለ ኀምሳ የት ነበረ?',
          orderIndex: 1,
          points: 10,
          explanation: 'The Apostles were gathered in the Upper Room in Jerusalem (ጽርሐ ጽዮን).',
          amharicExplanation: 'ሐዋርያት በኢየሩሳሌም በጽርሐ ጽዮን በአንድ ልብ ሆነው ሳሉ መንፈስ ቅዱስ ወረደባቸው።',
          choices: [
            { text: 'In the Upper Room in Jerusalem (Tsirha Zion)', amharicText: 'በኢየሩሳሌም በጽርሐ ጽዮን', orderIndex: 1, isCorrect: true },
            { text: 'In Rome', amharicText: 'በሮም', orderIndex: 2, isCorrect: false },
            { text: 'In Alexandria', amharicText: 'በእስክንድርያ', orderIndex: 3, isCorrect: false },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.choices.length).toBe(3);
    });

    it('Admin attaches approved reference documents and web links', async () => {
      // 1. Downloadable reference document
      const docRes = await request(app)
        .post(`/api/admin/curriculum/chapters/${chapterId}/references`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Apostolic History Detailed Notes',
          amharicTitle: 'የሐዋርያት ታሪክ ዝርዝር ማስታወሻ',
          url: 'https://eotc-andnet.org/docs/apostolic-notes.pdf',
          isDownloadable: true,
          downloadableDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/refs/apostolic-notes.pdf',
          downloadableDocSize: 204800,
          downloadableDocChecksum: 'b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab',
          orderIndex: 1,
        });
      expect(docRes.status).toBe(201);
      expect(docRes.body.data.isDownloadable).toBe(true);

      // 2. External URL reference (requires internet)
      const urlRes = await request(app)
        .post(`/api/admin/curriculum/chapters/${chapterId}/references`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'EOTC Patriarchate Archive',
          amharicTitle: 'የቅዱስ ሲኖዶስ መዛግብት ድረ-ገጽ',
          url: 'https://eotc-patriarchate.org/history',
          isDownloadable: false,
          orderIndex: 2,
        });
      expect(urlRes.status).toBe(201);
      expect(urlRes.body.data.isDownloadable).toBe(false);
    });
  });

  describe('4. Publishing Workflow & Student Package Manifest Retrieval', () => {
    it('Admin publishes Chapter 1 and generates Learning Package Manifest', async () => {
      const res = await request(app)
        .post(`/api/admin/curriculum/chapters/${chapterId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.manifest).toBeDefined();

      const manifest = res.body.data.manifest;
      expect(manifest.chapterId).toBe(chapterId);
      expect(manifest.version).toBe(3);
      expect(manifest.textbook.startPage).toBe(1);
      expect(manifest.textbook.endPage).toBe(30);
      expect(manifest.quizzes.length).toBeGreaterThanOrEqual(1);
      expect(manifest.references.length).toBe(2);
      expect(manifest.checksumSha256).toBeDefined();

      // Validate manifest conforms to shared Zod contract
      const parsed = LearningPackageManifestSchema.safeParse(manifest);
      expect(parsed.success).toBe(true);
    });

    it('Student can browse published curriculum under /api/student/curriculum', async () => {
      const res = await request(app)
        .get('/api/student/curriculum')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const grades = res.body.data;
      const g5 = grades.find((g: { level: number }) => g.level === 5);
      expect(g5).toBeDefined();
      expect(g5.subjects.length).toBeGreaterThanOrEqual(1);

      const histSubject = g5.subjects.find((s: { code: string }) => s.code === 'HIST-L5');
      expect(histSubject).toBeDefined();
      expect(histSubject.chapters.length).toBe(1);
      expect(histSubject.chapters[0].title).toBe('The Apostolic Era');
      expect(histSubject.chapters[0].isPublished).toBe(true);
    });

    it('Student can download the full Learning Package Manifest via /api/student/packages/:chapterId', async () => {
      const res = await request(app)
        .get(`/api/student/packages/${chapterId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const manifest = res.body.data;
      expect(manifest.chapterId).toBe(chapterId);
      expect(manifest.textbook.fileUrl).toContain('history-g5.pdf');
      expect(manifest.textbook.startPage).toBe(1);
      expect(manifest.textbook.endPage).toBe(30);
      expect(manifest.quizzes[0].questions[0].choices.length).toBe(3);

      // Verify practice answer key is present for offline practice evaluation
      const correctChoice = manifest.quizzes[0].questions[0].choices.find(
        (c: { isCorrect?: boolean }) => c.isCorrect === true
      );
      expect(correctChoice).toBeDefined();
      expect(correctChoice.text).toContain('Tsirha Zion');

      // Verify downloadable vs online reference flags
      const downloadableRef = manifest.references.find((r: { isDownloadable: boolean }) => r.isDownloadable);
      expect(downloadableRef).toBeDefined();
      expect(downloadableRef.downloadableDocUrl).toBeDefined();

      const onlineRef = manifest.references.find((r: { isDownloadable: boolean }) => !r.isDownloadable);
      expect(onlineRef).toBeDefined();
      expect(onlineRef.url).toBe('https://eotc-patriarchate.org/history');
    });

    it('Admin can unpublish chapter, after which student cannot fetch manifest', async () => {
      const unpubRes = await request(app)
        .post(`/api/admin/curriculum/chapters/${chapterId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(unpubRes.status).toBe(200);
      expect(unpubRes.body.data.isPublished).toBe(false);

      // Student attempt to download unpublished package must fail with 404
      const getRes = await request(app)
        .get(`/api/student/packages/${chapterId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('PACKAGE_NOT_FOUND');
    });
  });
});
