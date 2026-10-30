import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Student registration without email (username)', () => {
  const app = createApp();
  const USERNAME = 'kidus.test.user';
  const PASS = 'UsernamePass2026!';

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { username: USERNAME } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: USERNAME } });
    await prisma.$disconnect();
  });

  it('requires an email or a username', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: PASS, fullName: 'No Identifier' });
    expect(res.status).toBe(400);
  });

  it('registers a student with only a username and an empty email field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: '', username: 'Kidus.Test.User', password: PASS, fullName: 'Kidus Tester' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBeNull();
    expect(res.body.data.user.username).toBe(USERNAME);
    expect(res.body.data.user.role).toBe('STUDENT');
  });

  it('rejects a duplicate username', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: USERNAME, password: PASS, fullName: 'Copy Cat' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_EXISTS');
  });

  it('signs in with the username (any letter case) and rejects a wrong password', async () => {
    const ok = await request(app).post('/api/auth/login').send({ email: 'KIDUS.test.user', password: PASS });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.username).toBe(USERNAME);

    const bad = await request(app).post('/api/auth/login').send({ email: USERNAME, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('answers forgot-password the same way for a username-only account', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'someone@eotc-andnet.org' });
    expect(res.status).toBe(200);
  });
});
