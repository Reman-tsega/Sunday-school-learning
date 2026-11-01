# Telegram Mini App

Students can use the learning app inside Telegram. They open the bot, tap **Open app** and are signed in automatically: there is no email, username or password. The Mini App is the same Next.js site (`apps/web`), so every screen behaves the same as on the website.

## How it works

| Step | What happens |
|---|---|
| Launch | Telegram opens `TELEGRAM_WEBAPP_URL` (`https://<web>/tg`) and adds signed launch data (`initData`) to the URL. |
| Detect | An inline script in `layout.tsx` marks the page `html[data-tg]`. `TelegramProvider` (`src/lib/telegram-context.tsx`) loads `telegram-web-app.js`. Normal website visitors never load it. |
| Sign in | On **every launch** the raw `initData` is sent to `POST /api/auth/telegram`. The API checks the HMAC signature with the bot token (`apps/api/src/utils/telegram.ts`) and rejects data older than `TELEGRAM_AUTH_MAX_AGE_SECONDS` (24 hours). |
| First time | A `STUDENT` account is created with the Telegram first and last name. The student lands on `/profile?welcome=1` to fill in the other details, then chooses a grade on the home page. |
| Later launches | The same account is signed in. The session is a normal one (`issueSession`), so refresh, rotation, reuse detection and logout work exactly as on the website. |
| Session expiry | Inside Telegram, `api.ts` signs in again from `initData` instead of showing `/login`. |
| Offline launch | The cached session is used only if it belongs to the same Telegram user. Otherwise a "connect to the internet" screen is shown. |

Accounts that can't use the Mini App:
- **Teachers and admins** get a "students only" screen (`403 TELEGRAM_STUDENTS_ONLY`).
- **Deactivated accounts** get `403 ACCOUNT_INACTIVE`.

### Linking an existing website account

On the **website** profile page, a signed-in student taps **Connect Telegram**. The API creates a one-time code that is valid for 15 minutes and returns `https://t.me/<bot>?startapp=link_<code>`. Opening that link starts the Mini App with the code inside the signed `initData`, and the API then attaches the Telegram account to the website account.

If the student had already used the Mini App on its own, that Telegram-only account is **merged automatically**:
- Quiz attempts, enrollments, support tickets and notifications move over.
- Reading progress keeps the furthest page and any completion.
- Profile fields fill gaps but never overwrite.

The empty Telegram-only account is then deleted. A Telegram account that is already linked to another website account can't be taken over (`TELEGRAM_IN_USE`).

**Disconnect** on the website profile unlinks Telegram. It is only available to accounts that have a password, so that nobody locks themselves out.

The Mini App never asks for a password. No audit-log rows are written for student Telegram activity.

### Announcements as bot messages

When an admin sends an announcement, every student who uses the Telegram app and is in its audience (everyone, a grade, or a role, the same rules as in the app) also receives it as a message from the bot. The message has an **Open app** button. If the announcement has an Amharic version, it comes first, followed by the English one.

- **Sending:** `telegram_deliveries` is an outbox with one row per announcement and student. A single worker in the API sends about 20 messages per second.
  - When Telegram answers *too many requests*, it waits as long as Telegram asks.
  - When Telegram or the network is down, it pauses for a minute.
  - Messages still pending when the API stops are sent after it restarts.
  - The API is assumed to run as **one instance**. Two instances would send duplicates.
- **Students control it:**
  - `/stop` in the bot chat turns announcements off and `/start` turns them back on.
  - The profile page has an **Announcements in Telegram** switch.
  - The Mini App asks once per device for permission to receive messages from the bot.
- **Unreachable students:** Telegram refuses messages when the student blocked the bot or never started a chat with it. The student is then marked unreachable and skipped. They become reachable again when they send `/start`, unblock the bot, or open the Mini App with message permission.
- **Admins** see *Telegram: delivered / sending / failed* counts under each announcement.

### Differences inside Telegram

- **Hidden** (marked with `.tg-hide`): sign out, "Install app", and practice "Export / Print".
- **Telegram's own controls are used for:**
  - the Back button
  - the bottom button to submit a quiz, with haptic feedback
  - alerts and confirmations
- **External links** open in Telegram's browser.
- **Reference documents** saved for offline use can't be opened from Telegram's WebView. Inside Telegram they open online, and when offline a message explains that.
- **Height:** the app uses `--tg-viewport-stable-height` instead of `100vh`.
- **Telegram Web** (web.telegram.org) shows the app in an iframe. Storage there is partitioned by the browser, so downloads may not persist. The mobile and desktop apps behave like a normal browser.

## Setup

1. **Create the bot.** In [@BotFather](https://t.me/BotFather), send `/newbot` and keep the token.
2. **Set the Main Mini App.** In BotFather, open `/mybots` → your bot → **Bot Settings** → **Configure Mini App** → **Enable Mini App**, and set the URL to `https://<your-web-host>/tg`. This makes `t.me/<bot>?startapp=…` links, which the Connect Telegram button uses, open the Mini App directly.
3. **Set the API environment variables** on Render, or in `.env` locally:

   | Variable | Value |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | token from BotFather (server only, never `NEXT_PUBLIC_*`) |
   | `TELEGRAM_BOT_USERNAME` | bot username without `@` |
   | `TELEGRAM_WEBHOOK_SECRET` | 16–256 characters of `A-Z a-z 0-9 _ -`, e.g. `openssl rand -hex 32` |
   | `TELEGRAM_WEBAPP_URL` | `https://<your-web-host>/tg` |
   | `TELEGRAM_AUTH_MAX_AGE_SECONDS` | optional, default `86400` |

   - **If the bot token is empty**, Telegram is turned off and the endpoints answer `503 TELEGRAM_DISABLED`.
   - **If the token is set**, the other three variables are required and the API refuses to start without them.
4. **Deploy** the API. The migration `20261101090000_add_telegram_identity` runs through `prisma migrate deploy`. It only adds columns and a table and makes `passwordHash` nullable.
5. **Register the webhook, the menu button and the `/start` and `/stop` commands** once. The webhook also subscribes to block and unblock events. Run it again after upgrading from an earlier version of this feature:
   ```bash
   node scripts/telegram-setup.mjs https://<your-api-host>
   ```
6. In Telegram, open the bot and send `/start`, then tap **Open app**.

### Web app

No Telegram variables are needed on Vercel. The Mini App calls the API the same way the website does (`NEXT_PUBLIC_API_URL` or the `/api` rewrite).

`next.config.mjs` and `nginx/nginx.conf` send `Content-Security-Policy: frame-ancestors 'self' https://web.telegram.org https://*.telegram.org` so that Telegram Web can embed the app.

## Local testing

Telegram only opens `https://` URLs.

1. Run the API and web app (`pnpm dev:api`, `pnpm dev:web`).
2. Expose the web app with a tunnel, for example `cloudflared tunnel --url http://localhost:3001` or `ngrok http 3001`. The web app proxies `/api` to the local API, so one tunnel is enough.
3. Use a separate test bot. Set its Mini App URL to `https://<tunnel>/tg` and set `TELEGRAM_WEBAPP_URL` to match.
4. The bot's `/start` reply needs the webhook. Run `node scripts/telegram-setup.mjs https://<tunnel>`. For the Mini App alone, the menu button set in BotFather is enough.
5. Optionally, use Telegram's [test environment](https://core.telegram.org/bots/webapps#testing-mini-apps), which also allows `http://` URLs.
6. For debugging:
   - **Telegram Desktop:** enable WebView inspection under Settings → Advanced → Experimental.
   - **Android:** use `chrome://inspect`.

Automated tests:
- `apps/api/tests/telegram-initdata.test.ts`: signature validation
- `apps/api/tests/telegram-auth.test.ts`: sign-in, sessions, linking and merging, webhook. These run against the local database.
- `apps/api/tests/telegram-notify.test.ts`: announcement delivery, retries, outages, `/stop` and `/start`, blocked bots. Telegram is mocked.
- `apps/web/tests/telegram-bootstrap.test.tsx`: Mini App bootstrap with a mocked `window.Telegram.WebApp`
