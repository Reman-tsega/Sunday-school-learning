import { Router } from 'express';
import { login, refreshToken, logout, getMe, register, updateProfile, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { loginRateLimiter, registerRateLimiter, passwordResetRateLimiter } from '../middlewares/rateLimiter.js';

export const authRouter: Router = Router();

authRouter.post('/register', registerRateLimiter, register);
authRouter.post('/login', loginRateLimiter, login);
authRouter.post('/refresh', loginRateLimiter, refreshToken);
authRouter.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
authRouter.post('/reset-password', passwordResetRateLimiter, resetPassword);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, getMe);
authRouter.post('/change-password', authenticate, loginRateLimiter, changePassword);
authRouter.patch('/profile', authenticate, updateProfile);

