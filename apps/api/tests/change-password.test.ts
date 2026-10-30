import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Change password (signed-in user)', () => {
  const app = createApp();
  const EMAIL = 'change-pass@eotc-andnet.org';
  const OLD = 'CurrentPassword2026!';
  const NEW = 'ChangedPassword2026!';
  let access = '';
  let refresh = '';
  let otherRefresh = '';

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const reg = await request(app).post('/api/auth/register').send({ email: EMAIL, password: OLD, fullName: 'Change Pass Tester' });
    expect(reg.status).toBe(201);
    access = reg.body.data.tokens.accessToken;
    refresh = reg.body.data.tokens.refreshToken;
    const other = await request(app).post('/api/auth/login').send({ email: EMAIL, password: OLD });
    otherRefresh = other.body.data.tokens.refreshToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
  });

  const change = (body: object, token = access) =>
    request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${token}`).send(body);

  it('requires authentication', async () => {
    const res = await request(app).post('/api/auth/change-password').send({ currentPassword: OLD, newPassword: NEW });
    expect(res.status).toBe(401);
  });

  it('rejects a wrong current password with 400 (not a session error)', async () => {
    const res = await change({ currentPassword: 'wrong-password', newPassword: NEW });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('rejects a weak or unchanged new password', async () => {
    expect((await change({ currentPassword: OLD, newPassword: 'short' })).status).toBe(400);
    expect((await change({ currentPassword: OLD, newPassword: OLD })).body.error.code).toBe('PASSWORD_UNCHANGED');
  });

  it('changes the password, keeps this device and signs out the others', async () => {
    const ok = await change({ currentPassword: OLD, newPassword: NEW, refreshToken: refresh });
    expect(ok.status).toBe(200);

    expect((await request(app).post('/api/auth/login').send({ email: EMAIL, password: OLD })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: EMAIL, password: NEW })).status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: refresh })).status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: otherRefresh })).status).toBe(401);
  });
});
