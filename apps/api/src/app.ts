import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { generalApiRateLimiter } from './middlewares/rateLimiter.js';
import { env } from './config/env.js';

export function createApp(): express.Application {
  const app = express();

  // Hide technology fingerprinting
  app.disable('x-powered-by');

  // Trust first proxy (Nginx / Cloudflare / Docker bridge) for accurate client IP rate limiting
  app.set('trust proxy', 1);

  // Advanced Security HTTP Headers (OWASP Top 10 hardening)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false, // Frameguard disabled to allow internal Next.js PDF frame previews
      contentSecurityPolicy: false, // CSP managed at Nginx layer
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      dnsPrefetchControl: { allow: false },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    })
  );

  // Permissions-Policy restriction header
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // CORS Policy
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      maxAge: 86400, // 24 hours preflight cache
    })
  );

  // Body parser size limits (prevent memory saturation)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Static files for uploaded PDFs and textbooks with CORS & frame headers
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.removeHeader('X-Frame-Options');
      next();
    },
    express.static(path.resolve(process.cwd(), 'uploads'))
  );

  // Request logger
  app.use(requestLogger);

  // Mount API router under /api protected by general baseline rate limiter
  app.use('/api', generalApiRateLimiter, apiRouter);

  // 404 handler for unmatched routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
