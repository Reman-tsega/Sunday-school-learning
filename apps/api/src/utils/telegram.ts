import crypto from 'crypto';
import { TelegramInitDataUserSchema } from '@eotc/shared';
import type { z } from 'zod';

export type TelegramInitDataUser = z.infer<typeof TelegramInitDataUserSchema>;

export interface ValidatedInitData {
  user: TelegramInitDataUser;
  authDate: Date;
  /** The `startapp` parameter of the link that opened the Mini App, if any */
  startParam: string | null;
}

export class TelegramInitDataError extends Error {
  constructor(
    public readonly reason: 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' | 'NO_USER',
    message: string
  ) {
    super(message);
    this.name = 'TelegramInitDataError';
  }
}

// Tolerates small clock differences between Telegram's servers and ours
const CLOCK_SKEW_SECONDS = 60;

/**
 * Verifies Telegram.WebApp.initData as specified in
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
  now: Date = new Date()
): ValidatedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) {
    throw new TelegramInitDataError('MALFORMED', 'Telegram launch data has no valid signature');
  }
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();
  const received = Buffer.from(hash, 'hex');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw new TelegramInitDataError('BAD_SIGNATURE', 'Telegram launch data signature is invalid');
  }

  const authDateSeconds = Number(params.get('auth_date'));
  if (!Number.isInteger(authDateSeconds) || authDateSeconds <= 0) {
    throw new TelegramInitDataError('MALFORMED', 'Telegram launch data has no auth_date');
  }
  const ageSeconds = now.getTime() / 1000 - authDateSeconds;
  if (ageSeconds > maxAgeSeconds || ageSeconds < -CLOCK_SKEW_SECONDS) {
    throw new TelegramInitDataError('EXPIRED', 'Telegram launch data has expired');
  }

  const rawUser = params.get('user');
  if (!rawUser) {
    throw new TelegramInitDataError('NO_USER', 'Telegram launch data has no user');
  }
  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(rawUser);
  } catch {
    throw new TelegramInitDataError('MALFORMED', 'Telegram user data is not valid JSON');
  }
  const user = TelegramInitDataUserSchema.safeParse(parsedUser);
  if (!user.success || user.data.is_bot) {
    throw new TelegramInitDataError('NO_USER', 'Telegram user data is invalid');
  }

  return {
    user: user.data,
    authDate: new Date(authDateSeconds * 1000),
    startParam: params.get('start_param'),
  };
}

/** Constant-time check of the X-Telegram-Bot-Api-Secret-Token header Telegram sends with webhook calls. */
export function telegramSecretMatches(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
