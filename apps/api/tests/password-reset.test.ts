import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { mailService } from '../src/services/mail.service.js';

describe('Password reset by email', () => {
  const app = createApp();
  const EMAIL = 'reset-flow@eotc-andnet.org';
  const OLD_PASS = 'OldPassword2026!';
  const NEW_PASS = 'BrandNewPassword2026!';

  let resetUrl = '';
  const sendReset = vi.spyOn(mailService, 'sendPasswordReset').mockImplementation(async (_to, _name, url) => {
    resetUrl = url;
  });
  vi.spyOn(mailService, 'sendPasswordChanged').mockResolvedValue();

  const tokenFromUrl = () => new URL(resetUrl).searchParams.get('token') as string;
  const flush = () => new Promise((r) => setTimeout(r, 50));

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: EMAIL, password: OLD_PASS, fullName: 'Reset Flow Tester' });
    expect(res.status).toBe(201);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
  });

  it('answers identically for unknown emails and sends nothing', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody-here@eotc-andnet.org' });
    await flush();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendReset).not.toHaveBeenCalled();
  });

  it('emails a single-use link for a known account and stores only a hash', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: EMAIL });
    await flush();
    expect(res.status).toBe(200);
    expect(sendReset).toHaveBeenCalledTimes(1);

    const token = tokenFromUrl();
    expect(token).toHaveLength(64);
    const rows = await prisma.passwordResetToken.findMany({ where: { user: { email: EMAIL } } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).not.toBe(token);
  });

  it('rejects an unknown token and a weak password', async () => {
    const bad = await request(app).post('/api/auth/reset-password').send({ token: 'a'.repeat(64), password: NEW_PASS });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_RESET_TOKEN');

    const weak = await request(app).post('/api/auth/reset-password').send({ token: tokenFromUrl(), password: 'short' });
    expect(weak.status).toBe(400);
  });

  it('resets the password, signs out old sessions and burns the token', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: EMAIL, password: OLD_PASS });
    expect(login.status).toBe(200);
    const oldRefresh = login.body.data.tokens.refreshToken as string;

    const ok = await request(app).post('/api/auth/reset-password').send({ token: tokenFromUrl(), password: NEW_PASS });
    expect(ok.status).toBe(200);

    expect((await request(app).post('/api/auth/login').send({ email: EMAIL, password: OLD_PASS })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: EMAIL, password: NEW_PASS })).status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh })).status).toBe(401);

    const reuse = await request(app).post('/api/auth/reset-password').send({ token: tokenFromUrl(), password: 'AnotherPass2026!' });
    expect(reuse.status).toBe(400);
  });

  it('rejects an expired token', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    const { hashToken } = await import('../src/utils/token.js');
    const raw = 'b'.repeat(64);
    await prisma.passwordResetToken.create({
      data: { tokenHash: hashToken(raw), userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await request(app).post('/api/auth/reset-password').send({ token: raw, password: NEW_PASS });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });
});
