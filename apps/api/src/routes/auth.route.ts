import { Router } from 'express';
import { login, refreshToken, logout, getMe, register, updateProfile, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  loginRateLimiter,
  loginIpRateLimiter,
  refreshRateLimiter,
  changePasswordRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  telegramAuthRateLimiter,
} from '../middlewares/rateLimiter.js';
import { telegramSignIn, createTelegramLinkCode, unlinkTelegram } from '../controllers/telegram.controller.js';

export const authRouter: Router = Router();

authRouter.post('/register', registerRateLimiter, register);
authRouter.post('/login', loginIpRateLimiter, loginRateLimiter, login);
authRouter.post('/refresh', refreshRateLimiter, refreshToken);
authRouter.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
authRouter.post('/reset-password', passwordResetRateLimiter, resetPassword);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, getMe);
authRouter.post('/change-password', authenticate, changePasswordRateLimiter, changePassword);
authRouter.patch('/profile', authenticate, updateProfile);

// Telegram Mini App (students only)
authRouter.post('/telegram', telegramAuthRateLimiter, telegramSignIn);
authRouter.post('/telegram/link-code', authenticate, requireRole(['STUDENT']), createTelegramLinkCode);
authRouter.delete('/telegram', authenticate, unlinkTelegram);
