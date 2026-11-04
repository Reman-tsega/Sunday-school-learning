import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
import { UPLOADS_DIR } from '../src/services/file-store.service.js';
import { signInitData, launchFields, clearTestBotEnv } from './telegram-helpers.js';

// Telegram ids and curriculum reserved for this file
const TG = { student: 992000001, blocked: 992000002 };
const GRADE_LEVEL = 992;
const FILE_REL = 'references/vitest-telegram-files.pdf';
const PDF_BYTES = Buffer.from('%PDF-1.4\n% vitest reference document\n%%EOF\n');

interface SentCall {
  method: string;
  chatId: string;
  text?: string;
  file?: { name: string; type: string; bytes: Buffer };
}

/** Fake Telegram Bot API: records sendMessage (JSON) and sendDocument (multipart) calls. */
function fakeTelegram(failStatus?: number) {
  const sent: SentCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!String(url).startsWith('https://api.telegram.org/')) throw new Error(`Unexpected fetch ${url}`);
      if (failStatus) {
        return new Response(JSON.stringify({ ok: false, description: 'Forbidden: bot was blocked by the user' }), { status: failStatus });
      }
      const method = String(url).split('/').pop()!;
      if (init?.body instanceof FormData) {
        const doc = init.body.get('document') as File;
        sent.push({
          method,
          chatId: String(init.body.get('chat_id')),
          file: { name: doc.name, type: doc.type, bytes: Buffer.from(await doc.arrayBuffer()) },
        });
      } else {
        const body = JSON.parse(String(init?.body));
        sent.push({ method, chatId: String(body.chat_id), text: body.text });
      }
      return new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 });
    })
  );
  return sent;
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { telegramId: { in: Object.values(TG).map(BigInt) } } });
  await prisma.subject.deleteMany({ where: { grade: { level: GRADE_LEVEL } } });
  await prisma.grade.deleteMany({ where: { level: GRADE_LEVEL } });
  await prisma.storedFile.deleteMany({ where: { path: FILE_REL } });
  fs.rmSync(path.join(UPLOADS_DIR, FILE_REL), { force: true });
}

describe('Files sent to the student’s Telegram chat', () => {
  const app = createApp();
  const access: Record<number, string> = {};
  const refs = { document: '', link: '', draft: '' };

  beforeAll(async () => {
    await cleanup();
    const grade = await prisma.grade.create({ data: { level: GRADE_LEVEL, name: 'Telegram files grade' } });
    const subject = await prisma.subject.create({ data: { gradeId: grade.id, name: 'Files', code: 'TGF992' } });
    const published = await prisma.chapter.create({
      data: { subjectId: subject.id, chapterNumber: 1, title: 'Published', amharicTitle: 'የታተመ', isPublished: true },
    });
    const draft = await prisma.chapter.create({ data: { subjectId: subject.id, chapterNumber: 2, title: 'Draft' } });

    // The document exists only in the database copy, as after a host redeploy wiped the disk
    await prisma.storedFile.create({
      data: { path: FILE_REL, mimeType: 'application/pdf', size: PDF_BYTES.length, checksumSha256: crypto.createHash('sha256').update(PDF_BYTES).digest('hex'), data: PDF_BYTES },
    });
    const fileUrl = `https://api.example.test/uploads/${FILE_REL}`;
    refs.document = (await prisma.referenceLink.create({
      data: { chapterId: published.id, title: 'Worksheet', amharicTitle: 'የሥራ ሉህ', url: fileUrl, isDownloadable: true, downloadableDocUrl: fileUrl },
    })).id;
    refs.link = (await prisma.referenceLink.create({
      data: { chapterId: published.id, title: 'Portal', url: 'https://eotc.example/prayer' },
    })).id;
    refs.draft = (await prisma.referenceLink.create({
      data: { chapterId: draft.id, title: 'Hidden', url: fileUrl, isDownloadable: true, downloadableDocUrl: fileUrl },
    })).id;

    for (const id of Object.values(TG)) {
      const res = await request(app).post('/api/auth/telegram').send({ initData: signInitData(launchFields({ id })) });
      access[id] = res.body.data.tokens.accessToken;
    }
  });

  afterEach(() => vi.unstubAllGlobals());

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    clearTestBotEnv();
  });

  const send = (path: string, token: string | undefined, body: Record<string, unknown>) => {
    const req = request(app).post(`/api/telegram/${path}`);
    return (token ? req.set('Authorization', `Bearer ${token}`) : req).send(body);
  };

  it('uploads a reference document to the student’s chat, restoring it from the database copy', async () => {
    const sent = fakeTelegram();
    const res = await send('send-reference', access[TG.student], { referenceId: refs.document });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ sent: 'document' });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: 'sendDocument', chatId: String(TG.student) });
    expect(sent[0]!.file!.name).toBe('የሥራ ሉህ.pdf');
    expect(sent[0]!.file!.type).toBe('application/pdf');
    expect(sent[0]!.file!.bytes.equals(PDF_BYTES)).toBe(true);
  });

  it('sends a web-link reference as a message with the link', async () => {
    const sent = fakeTelegram();
    const res = await send('send-reference', access[TG.student], { referenceId: refs.link });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ sent: 'link' });
    expect(sent[0]).toMatchObject({ method: 'sendMessage', chatId: String(TG.student) });
    expect(sent[0]!.text).toContain('https://eotc.example/prayer');
  });

  it('does not send references of unpublished chapters to students', async () => {
    const sent = fakeTelegram();
    const res = await send('send-reference', access[TG.student], { referenceId: refs.draft });
    expect(res.status).toBe(404);
    expect(sent).toHaveLength(0);
  });

  it('sends a practice-question export as an HTML document', async () => {
    const sent = fakeTelegram();
    const html = '<!doctype html><html><body><h1>የልምምድ ጥያቄዎች</h1></body></html>';
    const res = await send('send-export', access[TG.student], { fileName: 'ምዕራፍ 1 / Practice', html, caption: 'Open <b>it</b>' });
    expect(res.status).toBe(200);
    expect(sent[0]).toMatchObject({ method: 'sendDocument', chatId: String(TG.student) });
    expect(sent[0]!.file!.name).toBe('ምዕራፍ 1 Practice.html');
    expect(sent[0]!.file!.bytes.toString('utf8')).toBe(html);
  });

  it('reports a blocked bot and marks the student unreachable', async () => {
    fakeTelegram(403);
    const res = await send('send-export', access[TG.blocked], { fileName: 'x', html: '<p>x</p>' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TELEGRAM_BOT_BLOCKED');
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(TG.blocked) } });
    expect(user?.telegramReachable).toBe(false);
  });

  it('needs a signed-in account connected to Telegram', async () => {
    fakeTelegram();
    expect((await send('send-export', undefined, { fileName: 'x', html: '<p>x</p>' })).status).toBe(401);

    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@eotc-andnet.org', password: 'AdminSecurePassword2026!' });
    const res = await send('send-export', admin.body.data.tokens.accessToken, { fileName: 'x', html: '<p>x</p>' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TELEGRAM_NOT_LINKED');
  });
});
