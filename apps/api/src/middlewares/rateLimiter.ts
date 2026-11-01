import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env.js';
import { telegramSecretMatches } from '../utils/telegram.js';

/**
 * Standard JSON response format for rate limit violations
 */
function createRateLimitResponse(_req: Request, res: Response, messageEn: string, messageAm: string) {
  return res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: messageEn,
      amharicMessage: messageAm,
      retryAfterSeconds: res.getHeader('Retry-After') || 60,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

// Many students share one carrier-grade NAT address (a whole classroom on the same mobile network),
// so login limits count failures per account, not every request from an IP.
function clientIp(req: Request): string {
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
}

/**
 * Brute-force guard for one account: 10 failed sign-ins per 15 minutes per IP and identifier.
 * Successful sign-ins do not count, so classmates signing in from the same network never block each other.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const identifier = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${clientIp(req)}|${identifier}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Too many login attempts from this IP. Please try again in 15 minutes.',
      'ከተፈቀደው በላይ የመግቢያ ሙከራ ተደርጓል፤ እባክዎ ከ15 ደቂቃ በኋላ እንደገና ይሞክሩ።'
    ),
});

/**
 * Backstop against credential stuffing across many accounts from one address:
 * 100 failed sign-ins per 15 minutes per IP (successful ones do not count)
 */
export const loginIpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => clientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Too many failed sign-in attempts from this network. Please try again in 15 minutes.',
      'ከዚህ አውታረ መረብ ብዙ ያልተሳኩ የመግቢያ ሙከራዎች ተደርገዋል፤ እባክዎ ከ15 ደቂቃ በኋላ እንደገና ይሞክሩ።'
    ),
});

/**
 * Session refresh: refresh tokens are 80 random hex characters and cannot be guessed, so this only
 * guards against floods. 300 per 15 minutes per IP
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: (req) => clientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Too many session refresh requests. Please try again shortly.',
      'ብዙ ጥያቄዎች ተልከዋል፤ እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።'
    ),
});

/**
 * Change password for a signed-in user: 10 attempts per 15 minutes per account (runs after authenticate)
 */
export const changePasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? clientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Too many password change attempts. Please try again in 15 minutes.',
      'ብዙ የይለፍ ቃል መቀየሪያ ሙከራዎች ተደርገዋል፤ እባክዎ ከ15 ደቂቃ በኋላ እንደገና ይሞክሩ።'
    ),
});

/**
 * Rate limiter for new user registration (prevents account generation bots)
 * 60 accounts per 1 hour per IP: a whole class may sign up together from one shared network address
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Account creation limit reached from this IP. Please try again in 1 hour.',
      'የመመዝገቢያ ገደብ ላይ ደርሰዋል፤ እባክዎ ከ1 ሰዓት በኋላ እንደገና ይሞክሩ።'
    ),
});

/**
 * Limiter for forgot/reset password (prevents email bombing and token guessing)
 * 8 requests per hour per IP
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Too many password reset requests. Please try again in 1 hour.',
      'ብዙ የይለፍ ቃል ማስመለስ ጥያቄዎች ተልከዋል፤ እባክዎ ከ1 ሰዓት በኋላ እንደገና ይሞክሩ።'
    ),
});

/**
 * Rate limiter for offline student batch sync (prevents database flooding)
 * 120 sync calls per 15 minutes per IP
 */
export const syncRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Sync request limit reached. Background syncing will resume shortly.',
      'የማመሳሰል ጥያቄ ገደብ ላይ ደርሰዋል፤ እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ።'
    ),
});

/**
 * Global API baseline rate limiter
 * 600 requests per 15 minutes per IP
 */
export const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  // Telegram delivers every bot update from a few shared IPs; genuine webhook calls carry our secret
  skip: (req) =>
    req.path === '/telegram/webhook' &&
    telegramSecretMatches(req.header('x-telegram-bot-api-secret-token'), env.TELEGRAM_WEBHOOK_SECRET),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Too many requests to the API. Please slow down.',
      'ከተፈቀደው በላይ ጥያቄ ተልኳል፤ እባክዎ ቀስ ብለው ይጠቀሙ።'
    ),
});

/**
 * Limiter for Telegram Mini App sign-in. Signatures cannot be guessed, so this only guards against floods;
 * it is looser than password login because many students share carrier-grade NAT IPs.
 * 60 requests per 15 minutes per IP
 */
export const telegramAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    createRateLimitResponse(
      req,
      res,
      'Too many sign-in attempts. Please try again in a few minutes.',
      'ብዙ የመግቢያ ሙከራዎች ተደርገዋል፤ እባክዎ ከጥቂት ደቂቃዎች በኋላ እንደገና ይሞክሩ።'
    ),
});
