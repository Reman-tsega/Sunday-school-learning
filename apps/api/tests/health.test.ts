import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, checkDatabaseHealth } from '../src/config/prisma.js';

describe('Phase 1 — Health & Database Foundation Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    // Verify DB connectivity before running tests
    const isDbReady = await checkDatabaseHealth();
    expect(isDbReady).toBe(true);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/health should return 200 with healthy database status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.version).toBe('0.1.0');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
    expect(new Date(res.body.data.timestamp).getTime()).not.toBeNaN();
  });

  it('Prisma should be able to query PostgreSQL directly', async () => {
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0]?.ok).toBe(1);
  });

  it('GET /api/unknown-route should return 404 with standard error structure', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
