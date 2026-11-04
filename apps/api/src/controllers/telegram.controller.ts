import type { Request, Response, NextFunction } from 'express';
import {
  TelegramAuthRequestSchema,
  TelegramNotificationsRequestSchema,
  TelegramSendExportRequestSchema,
  TelegramSendReferenceRequestSchema,
} from '@eotc/shared';
import type { ApiResponse, TelegramAuthResponseData, TelegramLinkCodeData, UserProfile } from '@eotc/shared';
import { env } from '../config/env.js';
import { telegramAuthService } from '../services/telegram-auth.service.js';
import { telegramBotService } from '../services/telegram-bot.service.js';
import { telegramFilesService } from '../services/telegram-files.service.js';
import { telegramSecretMatches } from '../utils/telegram.js';

export async function telegramSignIn(
  req: Request,
  res: Response<ApiResponse<TelegramAuthResponseData>>,
  next: NextFunction
): Promise<void> {
  try {
    const { initData } = TelegramAuthRequestSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await telegramAuthService.signIn(initData, userAgent, ipAddress);

    res.status(result.isNewUser ? 201 : 200).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function createTelegramLinkCode(
  req: Request,
  res: Response<ApiResponse<TelegramLinkCodeData>>,
  next: NextFunction
): Promise<void> {
  try {
    const result = await telegramAuthService.createLinkCode(req.user!.id);
    res.status(201).json({ success: true, data: result, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
}

export async function setTelegramNotifications(
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
  next: NextFunction
): Promise<void> {
  try {
    const { enabled } = TelegramNotificationsRequestSchema.parse(req.body);
    const user = await telegramAuthService.setNotifications(req.user!.id, enabled);
    res.status(200).json({ success: true, data: user, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
}

export async function unlinkTelegram(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    await telegramAuthService.unlink(req.user!.id);
    res.status(200).json({
      success: true,
      data: { message: 'Telegram has been disconnected from your account' },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function telegramWebhook(req: Request, res: Response): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    res.sendStatus(404);
    return;
  }
  if (!telegramSecretMatches(req.header('x-telegram-bot-api-secret-token'), env.TELEGRAM_WEBHOOK_SECRET)) {
    res.sendStatus(401);
    return;
  }

  // Acknowledge at once so Telegram does not retry; replies are sent in the background
  res.sendStatus(200);
  telegramBotService.handleUpdate(req.body).catch((err) => {
    console.error('Telegram update failed:', err instanceof Error ? err.message : err);
  });
}

/** Sends an approved reference document to the student's own Telegram chat */
export async function sendReferenceToTelegram(
  req: Request,
  res: Response<ApiResponse<{ sent: 'document' | 'link' }>>,
  next: NextFunction
): Promise<void> {
  try {
    const { referenceId } = TelegramSendReferenceRequestSchema.parse(req.body);
    const result = await telegramFilesService.sendReference(req.user!.id, req.user!.role, referenceId);
    res.status(200).json({ success: true, data: result, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
}

/** Sends a printable export (e.g. practice questions) to the student's own Telegram chat */
export async function sendExportToTelegram(
  req: Request,
  res: Response<ApiResponse<{ sent: true }>>,
  next: NextFunction
): Promise<void> {
  try {
    const { fileName, html, caption } = TelegramSendExportRequestSchema.parse(req.body);
    await telegramFilesService.sendExport(req.user!.id, fileName, html, caption);
    res.status(200).json({ success: true, data: { sent: true }, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
}
