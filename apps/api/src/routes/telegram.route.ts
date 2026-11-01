import { Router } from 'express';
import { telegramWebhook } from '../controllers/telegram.controller.js';

export const telegramRouter: Router = Router();

// Called by Telegram; authenticated with the X-Telegram-Bot-Api-Secret-Token header
telegramRouter.post('/webhook', telegramWebhook);
