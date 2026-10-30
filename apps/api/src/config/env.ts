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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Environment variable validation failed');
}

export const env = parsed.data;
