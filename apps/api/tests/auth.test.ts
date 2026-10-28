import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Phase 2 — Authentication & Authorization Tests', () => {
  const app = createApp();

  const ADMIN_EMAIL = 'admin@eotc-andnet.org';
  const ADMIN_PASS = 'AdminSecurePassword2026!';

  const TEACHER_EMAIL = 'teacher@eotc-andnet.org';
  const TEACHER_PASS = 'TeacherPassword2026!';

  const STUDENT_EMAIL = 'student@eotc-andnet.org';
  const STUDENT_PASS = 'StudentPassword2026!';

  let adminAccessToken: string;
  let adminRefreshToken: string;
  let teacherAccessToken: string;
  let studentAccessToken: string;

  beforeAll(async () => {
    // Clear any test accounts created in previous test runs
    await prisma.user.deleteMany({
      where: {
        email: { in: ['testuser-created@eotc-andnet.org', 'teststudent-rbac@eotc-andnet.org'] },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Login Workflows', () => {
    it('Admin can log in and receives tokens with role ADMIN', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.email).toBe(ADMIN_EMAIL);

      adminAccessToken = res.body.data.tokens.accessToken;
      adminRefreshToken = res.body.data.tokens.refreshToken;
    });

    it('Teacher can log in and receives role TEACHER', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: TEACHER_EMAIL,
        password: TEACHER_PASS,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('TEACHER');

      teacherAccessToken = res.body.data.tokens.accessToken;
    });

    it('Student can log in and receives role STUDENT', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: STUDENT_EMAIL,
        password: STUDENT_PASS,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');

      studentAccessToken = res.body.data.tokens.accessToken;
    });

    it('Rejects invalid password with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('Rejects non-existent email with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@eotc-andnet.org',
        password: 'AnyPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('Rejects malformed login request with 400 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Protected Route & Token Verification', () => {
    it('GET /api/auth/me returns current user with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(ADMIN_EMAIL);
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('GET /api/auth/me returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/auth/me returns 401 with invalid token string', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('3. Refresh Token Rotation & Invalidation', () => {
    let newRefreshToken: string;
    let newAccessToken: string;

    it('Refreshes session and rotates refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: adminRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).not.toBe(adminRefreshToken);

      newAccessToken = res.body.data.tokens.accessToken;
      newRefreshToken = res.body.data.tokens.refreshToken;

      // Verify the new access token works
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);
      expect(meRes.status).toBe(200);
    });

    it('Reusing previous refresh token fails and detects token reuse', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: adminRefreshToken, // Reusing old token
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_REUSE_DETECTED');
    });

    it('Rejects fabricated or unknown refresh token with 401', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'fabricated-random-token-string-1234567890',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('Logout revokes the refresh token', async () => {
      const logoutRes = await request(app).post('/api/auth/logout').send({
        refreshToken: newRefreshToken,
      });
      expect(logoutRes.status).toBe(200);

      // Attempting to refresh with the logged-out token should fail
      const refreshRes = await request(app).post('/api/auth/refresh').send({
        refreshToken: newRefreshToken,
      });
      expect(refreshRes.status).toBe(401);
    });
  });

  describe('4. Server-Enforced RBAC & Admin User Management', () => {
    let createdStudentId: string;
    const NEW_STUDENT_EMAIL = 'teststudent-rbac@eotc-andnet.org';
    const NEW_STUDENT_PASS = 'StudentSecret123!';

    it('Student cannot access POST /api/admin/users (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          email: 'unauthorized@eotc-andnet.org',
          password: 'Password123!',
          fullName: 'Unauthorized User',
          role: 'STUDENT',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Teacher cannot access POST /api/admin/users (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${teacherAccessToken}`)
        .send({
          email: 'unauthorized@eotc-andnet.org',
          password: 'Password123!',
          fullName: 'Unauthorized User',
          role: 'STUDENT',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Admin can create a new student account (201 Created)', async () => {
      // Re-login as Admin to obtain a fresh access token
      const loginRes = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
      });
      const freshAdminToken = loginRes.body.data.tokens.accessToken;

      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${freshAdminToken}`)
        .send({
          email: NEW_STUDENT_EMAIL,
          password: NEW_STUDENT_PASS,
          fullName: 'ኪዳነ ወልድ (Kidane Wold)',
          role: 'STUDENT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe(NEW_STUDENT_EMAIL);
      expect(res.body.data.role).toBe('STUDENT');
      expect(res.body.data.isActive).toBe(true);

      createdStudentId = res.body.data.id;
    });

    it('Newly created student can log in successfully', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: NEW_STUDENT_EMAIL,
        password: NEW_STUDENT_PASS,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(NEW_STUDENT_EMAIL);
    });

    it('Admin can list users with pagination and search', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
      });
      const freshAdminToken = loginRes.body.data.tokens.accessToken;

      const res = await request(app)
        .get('/api/admin/users?role=STUDENT&search=Kidane')
        .set('Authorization', `Bearer ${freshAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('Admin can deactivate a student account and blocked from login', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
      });
      const freshAdminToken = loginRes.body.data.tokens.accessToken;

      // Deactivate user
      const deactivateRes = await request(app)
        .patch(`/api/admin/users/${createdStudentId}/status`)
        .set('Authorization', `Bearer ${freshAdminToken}`)
        .send({ isActive: false });

      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.data.isActive).toBe(false);

      // Student attempting to log in must receive 403 ACCOUNT_INACTIVE
      const loginAttempt = await request(app).post('/api/auth/login').send({
        email: NEW_STUDENT_EMAIL,
        password: NEW_STUDENT_PASS,
      });

      expect(loginAttempt.status).toBe(403);
      expect(loginAttempt.body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    it('Admin can reactivate user and change role', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
      });
      const freshAdminToken = loginRes.body.data.tokens.accessToken;

      // Reactivate
      const reactivateRes = await request(app)
        .patch(`/api/admin/users/${createdStudentId}/status`)
        .set('Authorization', `Bearer ${freshAdminToken}`)
        .send({ isActive: true });
      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.isActive).toBe(true);

      // Update role to TEACHER
      const roleRes = await request(app)
        .patch(`/api/admin/users/${createdStudentId}/role`)
        .set('Authorization', `Bearer ${freshAdminToken}`)
        .send({ role: 'TEACHER' });
      expect(roleRes.status).toBe(200);
      expect(roleRes.body.data.role).toBe('TEACHER');

      // Verify user logs in with new TEACHER role
      const loginRes2 = await request(app).post('/api/auth/login').send({
        email: NEW_STUDENT_EMAIL,
        password: NEW_STUDENT_PASS,
      });
      expect(loginRes2.status).toBe(200);
      expect(loginRes2.body.data.user.role).toBe('TEACHER');
    });

    it('Admin can reset user password', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
      });
      const freshAdminToken = loginRes.body.data.tokens.accessToken;

      const NEW_PASSWORD = 'BrandNewPassword2026!';

      const resetRes = await request(app)
        .post(`/api/admin/users/${createdStudentId}/reset-password`)
        .set('Authorization', `Bearer ${freshAdminToken}`)
        .send({ newPassword: NEW_PASSWORD });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Old password fails
      const oldLogin = await request(app).post('/api/auth/login').send({
        email: NEW_STUDENT_EMAIL,
        password: NEW_STUDENT_PASS,
      });
      expect(oldLogin.status).toBe(401);

      // New password succeeds
      const newLogin = await request(app).post('/api/auth/login').send({
        email: NEW_STUDENT_EMAIL,
        password: NEW_PASSWORD,
      });
      expect(newLogin.status).toBe(200);
    });
  });
});
