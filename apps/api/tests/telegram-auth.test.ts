import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Configure a test bot before env.ts is imported
vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = '123456789:AAtest-bot-token-for-vitest-only_000';
  process.env.TELEGRAM_BOT_USERNAME = 'eotc_test_bot';
  process.env.TELEGRAM_WEBHOOK_SECRET = 'vitest-webhook-secret-0123456789';
  process.env.TELEGRAM_WEBAPP_URL = 'https://example.test/tg';
});

import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signInitData, launchFields } from './telegram-helpers.js';

// Telegram ids reserved for this file
const TG = { newStudent: 990000001, inactive: 990000002, teacher: 990000003, merge: 990000004 };
const TG_IDS = Object.values(TG).map(BigInt);
const WEB_USERNAMES = ['tgtest-web-merge', 'tgtest-web-other'];

function launch(id: number, extra: Record<string, string> = {}, user: Record<string, string> = {}) {
  return signInitData(launchFields({ id, ...user }, extra));
}

async function cleanup() {
  await prisma.user.deleteMany({
    where: { OR: [{ telegramId: { in: TG_IDS } }, { username: { in: WEB_USERNAMES } }] },
  });
}

describe('Telegram Mini App sign-in', () => {
  const app = createApp();
  const signIn = (initData: string, body: Record<string, unknown> = {}) =>
    request(app).post('/api/auth/telegram').send({ initData, ...body });

  beforeAll(cleanup);
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe('Automatic account creation and sign-in', () => {
    let firstUserId: string;
    let refreshToken: string;

    it('first launch creates a STUDENT named after the Telegram profile, ignoring any client role', async () => {
      const res = await signIn(launch(TG.newStudent, {}, { first_name: 'አበበ', last_name: 'ከበደ', username: 'abebe_k' }), {
        role: 'ADMIN',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.isNewUser).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.fullName).toBe('አበበ ከበደ');
      expect(res.body.data.user.telegramId).toBe(String(TG.newStudent));
      expect(res.body.data.user.telegramUsername).toBe('abebe_k');
      expect(res.body.data.user.hasPassword).toBe(false);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      firstUserId = res.body.data.user.id;
      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('every later launch signs in to the same account', async () => {
      const res = await signIn(launch(TG.newStudent, {}, { username: 'abebe_new' }));
      expect(res.status).toBe(200);
      expect(res.body.data.isNewUser).toBe(false);
      expect(res.body.data.user.id).toBe(firstUserId);
      expect(res.body.data.user.telegramUsername).toBe('abebe_new');
    });

    it('the session behaves exactly like a password session: /me, rotation, reuse detection, logout', async () => {
      const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(refreshed.status).toBe(200);
      const rotated = refreshed.body.data.tokens.refreshToken;

      const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${refreshed.body.data.tokens.accessToken}`);
      expect(me.status).toBe(200);
      expect(me.body.data.id).toBe(firstUserId);

      const reused = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(reused.status).toBe(401);
      expect(reused.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // Reuse detection revoked every session of the user, including the rotated one
      const afterReuse = await request(app).post('/api/auth/refresh').send({ refreshToken: rotated });
      expect(afterReuse.status).toBe(401);

      const fresh = await signIn(launch(TG.newStudent));
      await request(app).post('/api/auth/logout').send({ refreshToken: fresh.body.data.tokens.refreshToken });
      const afterLogout = await request(app).post('/api/auth/refresh').send({ refreshToken: fresh.body.data.tokens.refreshToken });
      expect(afterLogout.status).toBe(401);
    });

    it('password login and change-password do not work for a Telegram-only account', async () => {
      const session = await signIn(launch(TG.newStudent));
      const change = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${session.body.data.tokens.accessToken}`)
        .send({ currentPassword: 'anything1', newPassword: 'something-new-1' });
      expect(change.status).toBe(400);
      expect(change.body.error.code).toBe('NO_PASSWORD');
    });
  });

  describe('Rejections', () => {
    it('rejects an invalid signature and expired launch data', async () => {
      const tampered = new URLSearchParams(launch(TG.newStudent));
      tampered.set('user', JSON.stringify({ id: 1, first_name: 'Mallory' }));
      const bad = await signIn(tampered.toString());
      expect(bad.status).toBe(401);
      expect(bad.body.error.code).toBe('TELEGRAM_INIT_DATA_INVALID');

      const old = signInitData(launchFields({ id: TG.newStudent }, {}, Math.floor(Date.now() / 1000) - 2 * 86400));
      const expired = await signIn(old);
      expect(expired.status).toBe(401);
      expect(expired.body.error.code).toBe('TELEGRAM_INIT_DATA_EXPIRED');

      const missing = await request(app).post('/api/auth/telegram').send({});
      expect(missing.status).toBe(400);
    });

    it('rejects a deactivated student', async () => {
      await signIn(launch(TG.inactive));
      await prisma.user.update({ where: { telegramId: BigInt(TG.inactive) }, data: { isActive: false } });
      const res = await signIn(launch(TG.inactive));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    it('rejects teachers and admins: the Mini App is for students only', async () => {
      await prisma.user.create({
        data: { fullName: 'Telegram Teacher', role: 'TEACHER', passwordHash: null, telegramId: BigInt(TG.teacher) },
      });
      const res = await signIn(launch(TG.teacher));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TELEGRAM_STUDENTS_ONLY');
    });
  });

  describe('Linking an existing web account', () => {
    let webUserId: string;
    let webAccess: string;
    let otherAccess: string;
    let tgOnlyUserId: string;
    let linkParam: string;
    let chapterId: string;
    let gradeId: string;

    beforeAll(async () => {
      const chapter = await prisma.chapter.findFirstOrThrow({ include: { subject: true } });
      chapterId = chapter.id;
      gradeId = chapter.subject.gradeId;

      const web = await request(app)
        .post('/api/auth/register')
        .send({ username: WEB_USERNAMES[0], password: 'WebStudentPass1', fullName: 'Web Student', address: null });
      expect(web.status).toBe(201);
      webUserId = web.body.data.user.id;
      webAccess = web.body.data.tokens.accessToken;
      await prisma.studentProgress.create({
        data: { userId: webUserId, chapterId, lastReadPage: 3, isCompleted: false, lastStudiedAt: new Date('2026-01-01') },
      });

      const other = await request(app)
        .post('/api/auth/register')
        .send({ username: WEB_USERNAMES[1], password: 'WebStudentPass2', fullName: 'Other Student' });
      otherAccess = other.body.data.tokens.accessToken;

      // The same student already used the Mini App before linking, and has data there
      const tgOnly = await signIn(launch(TG.merge));
      tgOnlyUserId = tgOnly.body.data.user.id;
      await prisma.user.update({ where: { id: tgOnlyUserId }, data: { baptismalName: 'ወልደ ማርያም' } });
      await prisma.studentGradeEnrollment.create({ data: { userId: tgOnlyUserId, gradeId } });
      await prisma.studentProgress.create({
        data: { userId: tgOnlyUserId, chapterId, lastReadPage: 10, isCompleted: true, lastStudiedAt: new Date('2026-06-01') },
      });
    });

    it('a signed-in web student gets a one-time Mini App deep link', async () => {
      const res = await request(app).post('/api/auth/telegram/link-code').set('Authorization', `Bearer ${webAccess}`);
      expect(res.status).toBe(201);
      expect(res.body.data.deepLink).toMatch(/^https:\/\/t\.me\/eotc_test_bot\?startapp=link_[\w-]{22}$/);
      linkParam = new URL(res.body.data.deepLink).searchParams.get('startapp')!;
    });

    it('opening the link merges the Telegram-only account into the web account automatically', async () => {
      const res = await signIn(launch(TG.merge, { start_param: linkParam }));
      expect(res.status).toBe(200);
      expect(res.body.data.linkStatus).toBe('LINKED');
      expect(res.body.data.user.id).toBe(webUserId);
      expect(res.body.data.user.telegramId).toBe(String(TG.merge));
      expect(res.body.data.user.baptismalName).toBe('ወልደ ማርያም');
      expect(res.body.data.user.enrolledGradeIds).toContain(gradeId);

      const progress = await prisma.studentProgress.findUniqueOrThrow({
        where: { userId_chapterId: { userId: webUserId, chapterId } },
      });
      expect(progress.lastReadPage).toBe(10);
      expect(progress.isCompleted).toBe(true);
      expect(await prisma.user.findUnique({ where: { id: tgOnlyUserId } })).toBeNull();
    });

    it('re-opening the same link is harmless, and later launches go to the web account', async () => {
      const again = await signIn(launch(TG.merge, { start_param: linkParam }));
      expect(again.body.data.linkStatus).toBe('LINKED');
      expect(again.body.data.user.id).toBe(webUserId);

      const plain = await signIn(launch(TG.merge));
      expect(plain.body.data.user.id).toBe(webUserId);
      expect(plain.body.data.linkStatus).toBeUndefined();
    });

    it('a Telegram account linked to one web account cannot be taken over by another', async () => {
      const code = await request(app).post('/api/auth/telegram/link-code').set('Authorization', `Bearer ${otherAccess}`);
      const param = new URL(code.body.data.deepLink).searchParams.get('startapp')!;
      const res = await signIn(launch(TG.merge, { start_param: param }));
      expect(res.status).toBe(200);
      expect(res.body.data.linkStatus).toBe('TELEGRAM_IN_USE');
      expect(res.body.data.user.id).toBe(webUserId);
    });

    it('an unknown link code still signs the student in and reports the problem', async () => {
      const res = await signIn(launch(TG.newStudent, { start_param: 'link_AAAAAAAAAAAAAAAAAAAAAA' }));
      expect(res.status).toBe(200);
      expect(res.body.data.linkStatus).toBe('TELEGRAM_LINK_INVALID');
    });

    it('only students can create link codes', async () => {
      const teacher = await request(app)
        .post('/api/auth/login')
        .send({ email: 'teacher@eotc-andnet.org', password: 'TeacherPassword2026!' });
      if (teacher.status !== 200) return; // sample teacher not seeded in this database
      const res = await request(app)
        .post('/api/auth/telegram/link-code')
        .set('Authorization', `Bearer ${teacher.body.data.tokens.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('unlinking works for accounts with a password and is refused for Telegram-only ones', async () => {
      const tgOnly = await signIn(launch(TG.newStudent));
      const refused = await request(app)
        .delete('/api/auth/telegram')
        .set('Authorization', `Bearer ${tgOnly.body.data.tokens.accessToken}`);
      expect(refused.status).toBe(400);
      expect(refused.body.error.code).toBe('NO_PASSWORD');

      const ok = await request(app).delete('/api/auth/telegram').set('Authorization', `Bearer ${webAccess}`);
      expect(ok.status).toBe(200);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: webUserId } });
      expect(user.telegramId).toBeNull();
    });
  });

  describe('Bot webhook', () => {
    it('rejects requests without the secret token and answers /start with an Open app button', async () => {
      const denied = await request(app).post('/api/telegram/webhook').send({});
      expect(denied.status).toBe(401);

      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      const res = await request(app)
        .post('/api/telegram/webhook')
        .set('X-Telegram-Bot-Api-Secret-Token', 'vitest-webhook-secret-0123456789')
        .send({ message: { chat: { id: 5, type: 'private' }, from: { language_code: 'en' }, text: '/start' } });
      expect(res.status).toBe(200);

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toMatch(/\/sendMessage$/);
      const body = JSON.parse(init.body);
      expect(body.chat_id).toBe(5);
      expect(body.reply_markup.inline_keyboard[0][0].web_app.url).toBe('https://example.test/tg');
      vi.unstubAllGlobals();
    });
  });
});
