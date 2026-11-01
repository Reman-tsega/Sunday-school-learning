// Registers the bot webhook and the "Open app" menu button with Telegram.
// Usage (from the repo root, with the API's Telegram variables in .env or the environment):
//   node scripts/telegram-setup.mjs https://your-api.onrender.com
import { readFileSync, existsSync } from 'node:fs';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret, TELEGRAM_WEBAPP_URL: webAppUrl } = process.env;
const apiOrigin = (process.argv[2] || '').replace(/\/+$/, '');

if (!token || !secret || !webAppUrl || !/^https:\/\//.test(apiOrigin)) {
  console.error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and TELEGRAM_WEBAPP_URL, and pass the https API origin.');
  console.error('Example: node scripts/telegram-setup.mjs https://eotc-api.onrender.com');
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description}`);
  console.log(`✓ ${method}`);
}

await call('setWebhook', {
  url: `${apiOrigin}/api/telegram/webhook`,
  secret_token: secret,
  allowed_updates: ['message', 'my_chat_member'],
  drop_pending_updates: true,
});
await call('setChatMenuButton', {
  menu_button: { type: 'web_app', text: 'Open app', web_app: { url: webAppUrl } },
});
await call('setMyCommands', {
  commands: [
    { command: 'start', description: 'Open the learning app and turn announcements on' },
    { command: 'stop', description: 'Stop receiving announcements here' },
  ],
});
console.log('Done. Also set the Main Mini App URL in @BotFather (see docs/telegram-mini-app.md).');
