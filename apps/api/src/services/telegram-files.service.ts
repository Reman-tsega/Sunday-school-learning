import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { fileStoreService } from './file-store.service.js';
import { telegramBotService, type TelegramCallResult } from './telegram-bot.service.js';

const MAX_BYTES = 50 * 1024 * 1024; // Telegram's limit for files sent by bots

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
}

/** A readable file name: the title, safe for Telegram, with the source file's extension. */
function fileNameFor(title: string, sourceUrl: string): string {
  const ext = path.extname(new URL(sourceUrl, 'http://local').pathname).toLowerCase() || '.pdf';
  const base = title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'document';
  return base.toLowerCase().endsWith(ext) ? base : `${base}${ext}`;
}

/**
 * Sends files to the signed-in student's own Telegram chat. Inside the Mini App the WebView cannot
 * save or open downloads, so references and practice-question exports are delivered by the bot.
 */
export class TelegramFilesService {
  private async chatIdFor(userId: string): Promise<bigint> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
    if (!user?.telegramId) {
      throw new AppError(400, 'TELEGRAM_NOT_LINKED', 'This account is not connected to Telegram');
    }
    return user.telegramId;
  }

  private async deliver(userId: string, chatId: bigint, send: () => Promise<TelegramCallResult>): Promise<void> {
    const result = await send();
    if (result.ok) return;
    if (result.status === 403) {
      // The student blocked the bot or never pressed Start
      await prisma.user.update({ where: { id: userId }, data: { telegramReachable: false } });
      throw new AppError(409, 'TELEGRAM_BOT_BLOCKED', 'Start the bot in Telegram first, then try again');
    }
    console.error(`Could not send a file to Telegram chat ${chatId}: ${result.description ?? result.status}`);
    throw new AppError(502, 'TELEGRAM_SEND_FAILED', 'Telegram did not accept the file. Please try again');
  }

  private async loadFile(url: string): Promise<Buffer> {
    const rel = fileStoreService.relativePathFromUrl(url);
    if (rel) {
      const local = await fileStoreService.ensureOnDisk(rel);
      if (local) return fs.readFileSync(local);
    }
    if (!/^https?:\/\//i.test(url)) throw new AppError(404, 'FILE_NOT_FOUND', 'The document file could not be found');
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) throw new AppError(404, 'FILE_NOT_FOUND', 'The document file could not be downloaded');
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > MAX_BYTES) throw new AppError(413, 'FILE_TOO_LARGE', 'The document is larger than Telegram allows (50 MB)');
    return Buffer.from(await res.arrayBuffer());
  }

  async sendReference(userId: string, role: string, referenceId: string): Promise<{ sent: 'document' | 'link' }> {
    const chatId = await this.chatIdFor(userId);
    const ref = await prisma.referenceLink.findUnique({
      where: { id: referenceId },
      include: { chapter: { select: { isPublished: true, title: true, amharicTitle: true } } },
    });
    const staff = role === 'ADMIN' || role === 'TEACHER';
    if (!ref || ref.status !== 'APPROVED' || (!ref.chapter.isPublished && !staff)) {
      throw new AppError(404, 'NOT_FOUND', 'Reference not found');
    }

    const title = ref.amharicTitle || ref.title;
    const caption = `📄 <b>${escapeHtml(title)}</b>\n${escapeHtml(ref.chapter.amharicTitle || ref.chapter.title)}`;
    const source = ref.isDownloadable && ref.downloadableDocUrl ? ref.downloadableDocUrl : null;

    if (!source) {
      // A plain web link: send it as a message the student can open from the chat
      await this.deliver(userId, chatId, () =>
        telegramBotService.call('sendMessage', {
          chat_id: chatId.toString(),
          text: `${caption}\n${escapeHtml(ref.url)}`,
          parse_mode: 'HTML',
        })
      );
      return { sent: 'link' };
    }

    const data = await this.loadFile(source);
    if (data.length > MAX_BYTES) throw new AppError(413, 'FILE_TOO_LARGE', 'The document is larger than Telegram allows (50 MB)');
    const fileName = fileNameFor(title, source);
    const mimeType = MIME_BY_EXT[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream';
    await this.deliver(userId, chatId, () => telegramBotService.sendDocument(chatId, { data, fileName, mimeType }, caption));
    return { sent: 'document' };
  }

  /** Sends a printable HTML sheet (e.g. practice questions) built by the app. */
  async sendExport(userId: string, fileName: string, html: string, caption?: string): Promise<void> {
    const chatId = await this.chatIdFor(userId);
    const safeName = `${fileName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'export'}.html`;
    const data = Buffer.from(html, 'utf8');
    await this.deliver(userId, chatId, () =>
      telegramBotService.sendDocument(
        chatId,
        { data, fileName: safeName, mimeType: 'text/html' },
        caption ? escapeHtml(caption) : undefined
      )
    );
  }
}

export const telegramFilesService = new TelegramFilesService();
