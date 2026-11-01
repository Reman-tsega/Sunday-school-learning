import { env } from '../config/env.js';

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { language_code?: string };
    text?: string;
  };
}

const WELCOME_AM =
  'እንኳን ወደ ሰንበት ትምህርት ቤት የትምህርት መተግበሪያ በደህና መጡ!\nለመጀመር ከታች ያለውን "መተግበሪያውን ክፈት" ይጫኑ።';
const WELCOME_EN = 'Welcome to the Sunday School learning app!\nTap "Open app" below to start learning.';

export class TelegramBotService {
  private async call(method: string, payload: Record<string, unknown>): Promise<void> {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // The URL contains the bot token, so only the method name is logged
      console.error(`Telegram ${method} failed with HTTP ${res.status}`);
    }
  }

  /** Answers private messages with a button that opens the Mini App. */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message || message.chat.type !== 'private' || !env.TELEGRAM_WEBAPP_URL) return;

    const amharic = !message.from?.language_code || message.from.language_code === 'am';
    await this.call('sendMessage', {
      chat_id: message.chat.id,
      text: amharic ? `${WELCOME_AM}\n\n${WELCOME_EN}` : WELCOME_EN,
      reply_markup: {
        inline_keyboard: [
          [{ text: amharic ? 'መተግበሪያውን ክፈት / Open app' : 'Open app', web_app: { url: env.TELEGRAM_WEBAPP_URL } }],
        ],
      },
    });
  }
}

export const telegramBotService = new TelegramBotService();
