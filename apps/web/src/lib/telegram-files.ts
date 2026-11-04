import { ApiError } from '@/lib/api';
import { getTelegramWebApp, haptic, uiAlert } from '@/lib/telegram';

type Lang = 'am' | 'en';

/** Asks Telegram to let the bot message this student; resolves true when allowed. */
function askWriteAccess(): Promise<boolean> {
  const wa = getTelegramWebApp();
  if (!wa?.requestWriteAccess || !wa.isVersionAtLeast('6.9')) return Promise.resolve(false);
  return new Promise((resolve) => wa.requestWriteAccess!((granted) => resolve(granted)));
}

/**
 * Inside the Mini App files cannot be downloaded or printed, so the bot sends them to the student's own
 * chat. Runs `send`, explains the outcome, and if the bot is not allowed to message the student yet,
 * asks for that permission and tries once more.
 */
export async function sendFileToTelegramChat(send: () => Promise<unknown>, lang: Lang): Promise<boolean> {
  const t = (am: string, en: string) => (lang === 'am' ? am : en);
  if (!navigator.onLine) {
    await uiAlert(t('ወደ ቴሌግራም ለመላክ ኢንተርኔት ያስፈልጋል።', 'Sending to Telegram needs an internet connection.'));
    return false;
  }
  haptic('light');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await send();
      haptic('success');
      await uiAlert(
        t(
          'ፋይሉ ወደ ቴሌግራም ውይይትዎ ተልኳል። ለመክፈት የቦቱን ውይይት ይመልከቱ።',
          'Sent to your Telegram chat. Open the chat with the bot to view the file.'
        )
      );
      return true;
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === 'TELEGRAM_BOT_BLOCKED' && attempt === 0 && (await askWriteAccess())) continue;
      haptic('error');
      await uiAlert(
        code === 'TELEGRAM_BOT_BLOCKED'
          ? t(
              'ቦቱ መልእክት እንዲልክልዎ ይፍቀዱ፦ የቦቱን ውይይት ከፍተው /start ይላኩ፤ ከዚያ እንደገና ይሞክሩ።',
              'Let the bot message you: open the chat with the bot, send /start, then try again.'
            )
          : code === 'FILE_TOO_LARGE'
            ? t('ፋይሉ ለቴሌግራም በጣም ትልቅ ነው።', 'This file is too large for Telegram.')
            : t('ወደ ቴሌግራም መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።', 'Could not send it to Telegram. Please try again.')
      );
      return false;
    }
  }
  return false;
}
