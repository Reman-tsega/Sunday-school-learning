import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

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

/**
 * Strict limiter for authentication login (prevents brute-force / credential stuffing)
 * 10 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
 * Rate limiter for new user registration (prevents account generation bots)
 * 15 accounts per 1 hour per IP
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
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
