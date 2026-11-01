import { describe, it, expect } from 'vitest';
import { validateTelegramInitData, TelegramInitDataError } from '../src/utils/telegram.js';
import { TEST_BOT_TOKEN, signInitData, launchFields } from './telegram-helpers.js';

const DAY = 86400;

function expectReason(fn: () => unknown, reason: TelegramInitDataError['reason']) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(TelegramInitDataError);
    expect((err as TelegramInitDataError).reason).toBe(reason);
    return;
  }
  throw new Error(`Expected TelegramInitDataError(${reason})`);
}

describe('Telegram initData validation', () => {
  it('accepts correctly signed launch data and returns the user and start parameter', () => {
    const initData = signInitData(launchFields({ id: 42, username: 'abebe' }, { start_param: 'link_abc' }));
    const result = validateTelegramInitData(initData, TEST_BOT_TOKEN, DAY);
    expect(result.user.id).toBe(42);
    expect(result.user.username).toBe('abebe');
    expect(result.startParam).toBe('link_abc');
  });

  it('rejects a tampered hash', () => {
    const initData = signInitData(launchFields({ id: 42 }));
    const params = new URLSearchParams(initData);
    const hash = params.get('hash')!;
    params.set('hash', (hash[0] === 'a' ? 'b' : 'a') + hash.slice(1));
    expectReason(() => validateTelegramInitData(params.toString(), TEST_BOT_TOKEN, DAY), 'BAD_SIGNATURE');
  });

  it('rejects tampered fields (changing the user id)', () => {
    const initData = signInitData(launchFields({ id: 42 }));
    const params = new URLSearchParams(initData);
    params.set('user', JSON.stringify({ id: 1, first_name: 'Test' }));
    expectReason(() => validateTelegramInitData(params.toString(), TEST_BOT_TOKEN, DAY), 'BAD_SIGNATURE');
  });

  it('rejects data without a hash', () => {
    const params = new URLSearchParams(signInitData(launchFields({ id: 42 })));
    params.delete('hash');
    expectReason(() => validateTelegramInitData(params.toString(), TEST_BOT_TOKEN, DAY), 'MALFORMED');
  });

  it('rejects an expired auth_date and one far in the future', () => {
    const old = signInitData(launchFields({ id: 42 }, {}, Math.floor(Date.now() / 1000) - DAY - 5));
    expectReason(() => validateTelegramInitData(old, TEST_BOT_TOKEN, DAY), 'EXPIRED');

    const future = signInitData(launchFields({ id: 42 }, {}, Math.floor(Date.now() / 1000) + 600));
    expectReason(() => validateTelegramInitData(future, TEST_BOT_TOKEN, DAY), 'EXPIRED');
  });

  it('rejects data signed by a different bot', () => {
    const initData = signInitData(launchFields({ id: 42 }), '987654321:BBanother-bot-token-entirely_000000');
    expectReason(() => validateTelegramInitData(initData, TEST_BOT_TOKEN, DAY), 'BAD_SIGNATURE');
  });

  it('does not depend on parameter order', () => {
    const fields = launchFields({ id: 42 }, { chat_type: 'private', chat_instance: '-123' });
    const signed = new URLSearchParams(signInitData(fields));
    const reversed = new URLSearchParams([...signed.entries()].reverse()).toString();
    expect(validateTelegramInitData(reversed, TEST_BOT_TOKEN, DAY).user.id).toBe(42);
  });

  it('handles unicode (Amharic) names and percent-encoded spaces', () => {
    const fields = launchFields({ id: 7, first_name: 'አበበ', last_name: 'ከበደ ተስፋዬ' });
    const signed = signInitData(fields).replace(/\+/g, '%20');
    const result = validateTelegramInitData(signed, TEST_BOT_TOKEN, DAY);
    expect(result.user.first_name).toBe('አበበ');
    expect(result.user.last_name).toBe('ከበደ ተስፋዬ');
  });

  it('rejects launch data without a user, with invalid user JSON, or from a bot', () => {
    const noUser = launchFields({ id: 1 });
    delete (noUser as Record<string, string | undefined>).user;
    expectReason(() => validateTelegramInitData(signInitData(noUser), TEST_BOT_TOKEN, DAY), 'NO_USER');

    const badJson = { ...launchFields({ id: 1 }), user: '{not json' };
    expectReason(() => validateTelegramInitData(signInitData(badJson), TEST_BOT_TOKEN, DAY), 'MALFORMED');

    const bot = { ...launchFields({ id: 1 }), user: JSON.stringify({ id: 1, first_name: 'Bot', is_bot: true }) };
    expectReason(() => validateTelegramInitData(signInitData(bot), TEST_BOT_TOKEN, DAY), 'NO_USER');
  });
});
