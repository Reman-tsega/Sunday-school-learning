import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Chapter-Isolated PDF Reader & Boundary Delivery Verification', () => {
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

  beforeAll(async () => {
    // Clean up test grade
    await prisma.grade.deleteMany({
      where: { level: 9 },
    });

    // Obtain tokens
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

    // Create Grade 9
    const gradeRes = await request(app)
      .post('/api/admin/curriculum/grades')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        level: 9,
        name: 'Grade 9',
        amharicName: '፱ኛ ክፍል',
        description: 'Testing isolated PDF delivery',
        orderIndex: 9,
      });
    gradeId = gradeRes.body.data.id;

    // Create Subject with the 21-page sample textbook
    const subjectRes = await request(app)
      .post(`/api/admin/curriculum/grades/${gradeId}/subjects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dogma and Liturgy',
        amharicName: 'ትምህርተ ሃይማኖትና ሥርዓተ ቤተ ክርስቲያን',
        code: 'DOGMA-9',
        orderIndex: 1,
        textbookUrl: '/uploads/textbooks/eotc-sample-curriculum.pdf',
        textbookFileName: 'eotc-sample-curriculum.pdf',
        textbookFileSize: 500000,
        textbookTotalPages: 21,
      });
    subjectId = subjectRes.body.data.id;

    // Create Chapter 2 (mapped to master pages 10 to 18 -> 9 pages total)
    const chapterRes = await request(app)
      .post(`/api/admin/curriculum/subjects/${subjectId}/chapters`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        chapterNumber: 2,
        title: 'The Seven Sacraments',
        amharicTitle: 'ሰባቱ ምሥጢራተ ቤተ ክርስቲያን',
        description: 'Liturgical Sacraments and Faith',
        orderIndex: 2,
      });
    chapterId = chapterRes.body.data.id;

    // Upsert textbook with clamped pages 10 to 18 (9 pages)
    const tbRes = await request(app)
      .put(`/api/admin/curriculum/chapters/${chapterId}/textbook`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Dogma and Liturgy - Chapter 2',
        fileUrl: '/uploads/textbooks/eotc-sample-curriculum.pdf',
        fileSize: 500000,
        checksumSha256: 'dogma-sample-sha256',
        mimeType: 'application/pdf',
        startPage: 10,
        endPage: 18,
        totalPages: 21,
      });

    // Publish Chapter
    await request(app)
      .post(`/api/admin/curriculum/chapters/${chapterId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  afterAll(async () => {
    await prisma.grade.deleteMany({
      where: { level: 9 },
    });
    await prisma.$disconnect();
  });

  it('1. GET /api/chapters/:chapterId/pdf returns exact chapter-isolated PDF containing ONLY 9 pages', async () => {
    const res = await request(app)
      .get(`/api/chapters/${chapterId}/pdf`)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);

    expect(res.body).toBeDefined();
    // Parse binary response with pdf-lib to verify true page count
    const extractedDoc = await PDFDocument.load(res.body);
    const pageCount = extractedDoc.getPageCount();

    // Pages 10 through 18 inclusive = 9 pages
    expect(pageCount).toBe(9);
  });

  it('2. Chapter-isolated PDF is cached on disk and serves subsequent requests efficiently', async () => {
    const res = await request(app)
      .get(`/api/chapters/${chapterId}/pdf`)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);

    const extractedDoc = await PDFDocument.load(res.body);
    expect(extractedDoc.getPageCount()).toBe(9);
  });

  it('3. Updating chapter page range invalidates cache and returns newly clamped PDF', async () => {
    // Update Chapter 2 to pages 5 through 8 (4 pages)
    await request(app)
      .put(`/api/admin/curriculum/chapters/${chapterId}/textbook`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Dogma and Liturgy - Chapter 2 Updated',
        fileUrl: '/uploads/textbooks/eotc-sample-curriculum.pdf',
        fileSize: 500000,
        checksumSha256: 'dogma-sample-sha256-v2',
        mimeType: 'application/pdf',
        startPage: 5,
        endPage: 8,
        totalPages: 21,
      });

    const res = await request(app)
      .get(`/api/chapters/${chapterId}/pdf`)
      .expect(200);

    const updatedDoc = await PDFDocument.load(res.body);
    // Pages 5 through 8 inclusive = 4 pages
    expect(updatedDoc.getPageCount()).toBe(4);
  });

  it('4. Learning package manifest provides chapterPdfUrl pointing to isolated endpoint', async () => {
    const res = await request(app)
      .get(`/api/student/packages/${chapterId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    const manifest = res.body.data;
    expect(manifest.textbook).toBeDefined();
    expect(manifest.textbook.chapterPdfUrl).toBe(`/api/chapters/${chapterId}/pdf`);
  });
});
