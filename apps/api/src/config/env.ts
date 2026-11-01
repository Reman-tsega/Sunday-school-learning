import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root or current dir
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TEST_DATABASE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: z.string().default('eotc-learning'),
  CLOUDINARY_API_KEY: z.string().default('dev-key'),
  CLOUDINARY_API_SECRET: z.string().default('dev-secret'),
  CLOUDINARY_FOLDER: z.string().default('eotc-learning-materials'),
  // Public URL of the web app, used to build links in emails
  WEB_APP_URL: z.string().url().default('http://localhost:3001'),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  // SMTP (optional in development: without SMTP_HOST emails are printed to the API console)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('EOTC Sunday School <no-reply@localhost>'),
  // Creates the public sample Admin, Teacher and Student accounts used by the quick-login buttons
  SEED_DEMO_ACCOUNTS: z.enum(['true', 'false']).default('false'),
  INITIAL_ADMIN_EMAIL: z.string().email().default('admin@eotc-andnet.org'),
  INITIAL_ADMIN_PASSWORD: z.string().default('AdminSecurePassword2026!'),
  INITIAL_ADMIN_NAME: z.string().default('ሊቀ ጉባኤ Admin'),
  // Telegram Mini App (optional: without a bot token the Telegram endpoints answer 503 TELEGRAM_DISABLED)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  // Public URL the bot's "Open app" button points to, e.g. https://your-app.vercel.app/tg
  TELEGRAM_WEBAPP_URL: z.string().url().optional(),
  // How old a Mini App launch signature may be when it is exchanged for a session
  TELEGRAM_AUTH_MAX_AGE_SECONDS: z.coerce.number().int().min(60).default(86400),
}).superRefine((e, ctx) => {
  // A configured bot must be fully configured, so a half-set deployment fails at startup instead of at runtime
  if (!e.TELEGRAM_BOT_TOKEN) return;
  if (!/^\d+:[\w-]{30,}$/.test(e.TELEGRAM_BOT_TOKEN)) {
    ctx.addIssue({ code: 'custom', path: ['TELEGRAM_BOT_TOKEN'], message: 'Not a valid bot token from @BotFather' });
  }
  if (!e.TELEGRAM_BOT_USERNAME) {
    ctx.addIssue({ code: 'custom', path: ['TELEGRAM_BOT_USERNAME'], message: 'Required when TELEGRAM_BOT_TOKEN is set' });
  }
  if (!e.TELEGRAM_WEBAPP_URL) {
    ctx.addIssue({ code: 'custom', path: ['TELEGRAM_WEBAPP_URL'], message: 'Required when TELEGRAM_BOT_TOKEN is set' });
  }
  // Telegram allows 1-256 characters of A-Z, a-z, 0-9, _ and -
  if (!e.TELEGRAM_WEBHOOK_SECRET || !/^[\w-]{16,256}$/.test(e.TELEGRAM_WEBHOOK_SECRET)) {
    ctx.addIssue({
      code: 'custom',
      path: ['TELEGRAM_WEBHOOK_SECRET'],
      message: 'Required when TELEGRAM_BOT_TOKEN is set: 16-256 letters, digits, _ or -',
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Environment variable validation failed');
}

export const env = parsed.data;
