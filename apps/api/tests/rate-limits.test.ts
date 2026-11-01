import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

// All requests in this file come from the same IP, like a classroom behind one mobile-network address
describe('Login rate limits on a shared network address', () => {
  const app = createApp();
  const STUDENT = { email: 'student@eotc-andnet.org', password: 'StudentPassword2026!' };

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('many successful sign-ins from one address are never blocked', async () => {
    for (let i = 0; i < 15; i++) {
      const res = await request(app).post('/api/auth/login').send(STUDENT);
      expect(res.status).toBe(200);
    }
  });

  it('repeated wrong passwords lock only that account, not classmates on the same network', async () => {
    const target = 'ratelimit-target@eotc-andnet.org';
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/api/auth/login').send({ email: target, password: 'wrong-password' });
      expect(res.status).toBe(401);
    }
    const blocked = await request(app).post('/api/auth/login').send({ email: target, password: 'wrong-password' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

    // Same identifier in different letter case counts as the same account
    const caseVariant = await request(app).post('/api/auth/login').send({ email: target.toUpperCase(), password: 'x-wrong-1' });
    expect(caseVariant.status).toBe(429);

    const classmate = await request(app).post('/api/auth/login').send(STUDENT);
    expect(classmate.status).toBe(200);
  });

  it('session refreshes do not use up the sign-in allowance', async () => {
    const login = await request(app).post('/api/auth/login').send(STUDENT);
    let refreshToken: string = login.body.data.tokens.refreshToken;
    for (let i = 0; i < 15; i++) {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(200);
      refreshToken = res.body.data.tokens.refreshToken;
    }
  });
});
