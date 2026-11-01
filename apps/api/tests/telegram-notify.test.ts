import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
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
import { telegramNotifyService, formatAnnouncement } from '../src/services/telegram-notify.service.js';
import { signInitData, launchFields, clearTestBotEnv } from './telegram-helpers.js';

// Telegram ids and curriculum reserved for this file
const TG = { enrolled: 991000001, other: 991000002, optedOut: 991000003, blocked: 991000004, flaky: 991000005 };
const TG_IDS = Object.values(TG).map(BigInt);
const GRADE_LEVEL = 991;
const TITLE_PREFIX = 'TG-NOTIFY-TEST';

interface SentMessage {
  chat_id: string;
  text: string;
  parse_mode?: string;
  reply_markup?: { inline_keyboard: Array<Array<{ web_app?: { url: string } }>> };
}

/** Fake Telegram Bot API: records sendMessage calls; per-chat responses can be overridden. */
function fakeTelegram(responses: Record<string, Array<{ status: number; body: Record<string, unknown> }>> = {}) {
  const sent: SentMessage[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (!String(url).startsWith('https://api.telegram.org/')) throw new Error(`Unexpected fetch ${url}`);
    const body = JSON.parse(String(init?.body)) as SentMessage;
    const queued = responses[String(body.chat_id)]?.shift();
    if (queued) return new Response(JSON.stringify(queued.body), { status: queued.status });
    sent.push(body);
    return new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { sent, fetchMock };
}

async function cleanup() {
  await prisma.notification.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: TG_IDS } } });
  await prisma.subject.deleteMany({ where: { grade: { level: GRADE_LEVEL } } });
  await prisma.grade.deleteMany({ where: { level: GRADE_LEVEL } });
}

describe('Announcements as Telegram bot messages', () => {
  const app = createApp();
  let adminToken: string;
  let gradeId: string;
  const access: Record<number, string> = {};

  const signIn = (id: number, user: Record<string, unknown> = {}) =>
    request(app)
      .post('/api/auth/telegram')
      .send({ initData: signInitData(launchFields({ id, ...user })) });

  const announce = (body: Record<string, unknown>) =>
    request(app).post('/api/admin/notifications').set('Authorization', `Bearer ${adminToken}`).send(body);

  beforeAll(async () => {
    await cleanup();
    const admin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@eotc-andnet.org', password: 'AdminSecurePassword2026!' });
    adminToken = admin.body.data.tokens.accessToken;

    gradeId = (await prisma.grade.create({ data: { level: GRADE_LEVEL, name: 'Telegram notify grade' } })).id;

    for (const id of Object.values(TG)) {
      const res = await signIn(id);
      access[id] = res.body.data.tokens.accessToken;
      if (id !== TG.other) {
        await prisma.studentGradeEnrollment.create({ data: { userId: res.body.data.user.id, gradeId } });
      }
    }

    // This student turned announcements off from the profile switch
    const optOut = await request(app)
      .patch('/api/auth/telegram/notifications')
      .set('Authorization', `Bearer ${access[TG.optedOut]}`)
      .send({ enabled: false });
    expect(optOut.status).toBe(200);
    expect(optOut.body.data.telegramNotify).toBe(false);
  });

  afterEach(async () => {
    await telegramNotifyService.idle();
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    clearTestBotEnv();
  });

  it('sends a grade announcement to that grade’s Telegram students, skipping opted-out ones', async () => {
    const { sent } = fakeTelegram({
      [String(TG.blocked)]: [{ status: 403, body: { ok: false, description: 'Forbidden: bot was blocked by the user' } }],
    });

    const res = await announce({
      title: `${TITLE_PREFIX} Exam <Saturday>`,
      amharicTitle: 'የቅዳሜ ፈተና',
      content: 'Bring your book & pen.',
      amharicContent: 'መጽሐፍዎን ይዘው ይምጡ።',
      targetType: 'BY_GRADE',
      targetGradeId: gradeId,
    });
    expect(res.status).toBe(201);
    await telegramNotifyService.idle();

    const recipients = sent.map((m) => m.chat_id).sort();
    expect(recipients).toEqual([String(TG.enrolled), String(TG.flaky)].sort());

    const message = sent[0]!;
    expect(message.parse_mode).toBe('HTML');
    expect(message.text).toContain('<b>የቅዳሜ ፈተና</b>');
    expect(message.text).toContain('Exam &lt;Saturday&gt;');
    expect(message.text).toContain('Bring your book &amp; pen.');
    expect(message.reply_markup?.inline_keyboard[0]?.[0]?.web_app?.url).toBe('https://example.test/tg');

    // Blocking the bot is remembered, so later announcements do not try again
    const blocked = await prisma.user.findUniqueOrThrow({ where: { telegramId: BigInt(TG.blocked) } });
    expect(blocked.telegramReachable).toBe(false);

    const list = await request(app).get('/api/admin/notifications').set('Authorization', `Bearer ${adminToken}`);
    const item = list.body.data.find((n: { id: string }) => n.id === res.body.data.id);
    expect(item.telegram).toEqual({ sent: 2, pending: 0, failed: 1 });
  });

  it('waits and retries when Telegram says to slow down', async () => {
    const { sent } = fakeTelegram({
      [String(TG.enrolled)]: [{ status: 429, body: { ok: false, description: 'Too Many Requests', parameters: { retry_after: 1 } } }],
    });

    const res = await announce({ title: `${TITLE_PREFIX} Retry`, content: 'Hello', targetType: 'BY_GRADE', targetGradeId: gradeId });
    await telegramNotifyService.idle();

    expect(sent.map((m) => m.chat_id).sort()).toEqual([String(TG.enrolled), String(TG.flaky)].sort());
    const deliveries = await prisma.telegramDelivery.findMany({ where: { notificationId: res.body.data.id } });
    expect(deliveries.every((d) => d.status === 'SENT')).toBe(true);
  });

  it('a Telegram outage leaves deliveries pending to resume later instead of failing them', async () => {
    fakeTelegram({
      [String(TG.enrolled)]: [{ status: 502, body: { ok: false, description: 'Bad Gateway' } }],
      [String(TG.flaky)]: [{ status: 502, body: { ok: false, description: 'Bad Gateway' } }],
    });

    const res = await announce({ title: `${TITLE_PREFIX} Outage`, content: 'Hello', targetType: 'BY_GRADE', targetGradeId: gradeId });
    await telegramNotifyService.idle();

    const deliveries = await prisma.telegramDelivery.findMany({ where: { notificationId: res.body.data.id } });
    expect(deliveries.some((d) => d.status === 'PENDING' && d.attempts === 1 && d.lastError === 'Bad Gateway')).toBe(true);
    expect(deliveries.some((d) => d.status === 'FAILED')).toBe(false);

    // Telegram is back: resuming the queue delivers what was left
    const { sent } = fakeTelegram();
    telegramNotifyService.kick();
    await telegramNotifyService.idle();
    expect(sent.length).toBeGreaterThan(0);
    const after = await prisma.telegramDelivery.findMany({ where: { notificationId: res.body.data.id } });
    expect(after.every((d) => d.status === 'SENT')).toBe(true);
  });

  it('/stop and /start in the bot chat turn announcements off and on', async () => {
    fakeTelegram();
    const webhook = (text: string) =>
      request(app)
        .post('/api/telegram/webhook')
        .set('X-Telegram-Bot-Api-Secret-Token', 'vitest-webhook-secret-0123456789')
        .send({ message: { chat: { id: TG.enrolled, type: 'private' }, from: { id: TG.enrolled, language_code: 'en' }, text } });

    await webhook('/stop');
    await vi.waitFor(async () => {
      const u = await prisma.user.findUniqueOrThrow({ where: { telegramId: BigInt(TG.enrolled) } });
      expect(u.telegramNotify).toBe(false);
    });

    await webhook('/start');
    await vi.waitFor(async () => {
      const u = await prisma.user.findUniqueOrThrow({ where: { telegramId: BigInt(TG.enrolled) } });
      expect(u.telegramNotify).toBe(true);
    });
  });

  it('blocking the bot is noticed, and opening the app with message permission undoes it', async () => {
    fakeTelegram();
    await request(app)
      .post('/api/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'vitest-webhook-secret-0123456789')
      .send({ my_chat_member: { chat: { id: TG.other, type: 'private' }, from: { id: TG.other }, new_chat_member: { status: 'kicked' } } });
    await vi.waitFor(async () => {
      const u = await prisma.user.findUniqueOrThrow({ where: { telegramId: BigInt(TG.other) } });
      expect(u.telegramReachable).toBe(false);
    });

    await signIn(TG.other, { allows_write_to_pm: true } as Record<string, unknown>);
    const u = await prisma.user.findUniqueOrThrow({ where: { telegramId: BigInt(TG.other) } });
    expect(u.telegramReachable).toBe(true);
  });

  it('the notifications switch requires a linked Telegram account', async () => {
    const student = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@eotc-andnet.org', password: 'StudentPassword2026!' });
    if (student.status !== 200) return; // sample student not seeded in this database
    const res = await request(app)
      .patch('/api/auth/telegram/notifications')
      .set('Authorization', `Bearer ${student.body.data.tokens.accessToken}`)
      .send({ enabled: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TELEGRAM_NOT_LINKED');
  });

  it('long announcements are cut to fit one Telegram message', () => {
    const text = formatAnnouncement({
      title: 'Long',
      amharicTitle: null,
      content: 'line of text\n'.repeat(1000),
      amharicContent: null,
    });
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text.endsWith('…')).toBe(true);
    expect(text).toContain('<b>Long</b>');
  });
});
