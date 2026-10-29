import { Router } from 'express';
import { login, refreshToken, logout, getMe, register, updateProfile } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { loginRateLimiter, registerRateLimiter } from '../middlewares/rateLimiter.js';

export const authRouter: Router = Router();

authRouter.post('/register', registerRateLimiter, register);
authRouter.post('/login', loginRateLimiter, login);
authRouter.post('/refresh', loginRateLimiter, refreshToken);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, getMe);
authRouter.patch('/profile', authenticate, updateProfile);

