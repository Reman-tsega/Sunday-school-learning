import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; language_code?: string };
    text?: string;
  };
  // Sent when the student blocks or unblocks the bot
  my_chat_member?: {
    chat: { id: number; type: string };
    from: { id: number };
    new_chat_member: { status: string };
  };
}

export interface TelegramCallResult {
  ok: boolean;
  /** HTTP status, or 0 when Telegram could not be reached */
  status: number;
  description?: string;
  /** Seconds to wait before retrying (HTTP 429) */
  retryAfter?: number;
}

const WELCOME_AM =
  'እንኳን ወደ ሰንበት ትምህርት ቤት የትምህርት መተግበሪያ በደህና መጡ!\nለመጀመር ከታች ያለውን "መተግበሪያውን ክፈት" ይጫኑ።';
const WELCOME_EN = 'Welcome to the Sunday School learning app!\nTap "Open app" below to start learning.';
const STOPPED_AM = 'ማስታወቂያዎች ከእንግዲህ እዚህ አይላኩም። እንደገና ለማብራት /start ይላኩ።';
const STOPPED_EN = "You won't get announcements here any more. Send /start to turn them back on.";

export class TelegramBotService {
  async call(method: string, payload: Record<string, unknown>): Promise<TelegramCallResult> {
    try {
      const res = await fetch(`${env.TELEGRAM_API_BASE_URL.replace(/\/+$/, '')}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
        parameters?: { retry_after?: number };
      };
      if (!res.ok || !json.ok) {
        // The URL contains the bot token, so only the method name is logged
        console.error(`Telegram ${method} failed with HTTP ${res.status}: ${json.description ?? ''}`);
      }
      return {
        ok: res.ok && json.ok === true,
        status: res.status,
        ...(json.description ? { description: json.description } : {}),
        ...(json.parameters?.retry_after ? { retryAfter: json.parameters.retry_after } : {}),
      };
    } catch (err) {
      return { ok: false, status: 0, description: err instanceof Error ? err.message : 'Network error' };
    }
  }

  openAppKeyboard(amharic: boolean) {
    return {
      inline_keyboard: [
        [{ text: amharic ? 'መተግበሪያውን ክፈት / Open app' : 'Open app', web_app: { url: env.TELEGRAM_WEBAPP_URL } }],
      ],
    };
  }

  /** /start opens the app and turns announcements on, /stop turns them off; anything else gets the start reply. */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const member = update.my_chat_member;
    if (member && member.chat.type === 'private' && Number.isSafeInteger(member.from?.id)) {
      const reachable = member.new_chat_member.status === 'member';
      await prisma.user.updateMany({
        where: { telegramId: BigInt(member.from.id) },
        data: { telegramReachable: reachable },
      });
      return;
    }

    const message = update.message;
    if (!message || message.chat.type !== 'private' || !env.TELEGRAM_WEBAPP_URL) return;

    const amharic = !message.from?.language_code || message.from.language_code === 'am';
    const command = message.text?.trim().split(/[\s@]/)[0]?.toLowerCase();
    const telegramId = Number.isSafeInteger(message.from?.id) ? BigInt(message.from!.id) : null;

    if (command === '/stop') {
      if (telegramId) {
        await prisma.user.updateMany({ where: { telegramId }, data: { telegramNotify: false } });
      }
      await this.call('sendMessage', {
        chat_id: message.chat.id,
        text: amharic ? `${STOPPED_AM}\n\n${STOPPED_EN}` : STOPPED_EN,
      });
      return;
    }

    if (command === '/start' && telegramId) {
      await prisma.user.updateMany({
        where: { telegramId },
        data: { telegramNotify: true, telegramReachable: true },
      });
    }

    await this.call('sendMessage', {
      chat_id: message.chat.id,
      text: amharic ? `${WELCOME_AM}\n\n${WELCOME_EN}` : WELCOME_EN,
      reply_markup: this.openAppKeyboard(amharic),
    });
  }
}

export const telegramBotService = new TelegramBotService();
