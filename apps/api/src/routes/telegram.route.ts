import { Router } from 'express';
import { sendExportToTelegram, sendReferenceToTelegram, telegramWebhook } from '../controllers/telegram.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { telegramFileRateLimiter } from '../middlewares/rateLimiter.js';

export const telegramRouter: Router = Router();

// Called by Telegram; authenticated with the X-Telegram-Bot-Api-Secret-Token header
telegramRouter.post('/webhook', telegramWebhook);

// The bot delivers files to the signed-in student's own chat (the Mini App cannot save downloads)
telegramRouter.post('/send-reference', authenticate, telegramFileRateLimiter, sendReferenceToTelegram);
telegramRouter.post('/send-export', authenticate, telegramFileRateLimiter, sendExportToTelegram);
