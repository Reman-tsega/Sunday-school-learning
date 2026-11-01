import crypto from 'crypto';

export const TEST_BOT_TOKEN = '123456789:AAtest-bot-token-for-vitest-only_000';

/** Builds Telegram.WebApp.initData exactly as Telegram signs it. */
export function signInitData(
  fields: Record<string, string>,
  botToken: string = TEST_BOT_TOKEN
): string {
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

export function launchFields(
  user: { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string },
  extra: Record<string, string> = {},
  authDate: number = Math.floor(Date.now() / 1000)
): Record<string, string> {
  return {
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify({ first_name: 'Test', ...user }),
    auth_date: String(authDate),
    ...extra,
  };
}

/** Test files share worker processes; remove the test bot so later files run with Telegram turned off. */
export function clearTestBotEnv(): void {
  for (const key of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_WEBAPP_URL']) {
    delete process.env[key];
  }
}
