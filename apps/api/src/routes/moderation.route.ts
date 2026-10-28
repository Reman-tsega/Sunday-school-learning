import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  getPendingSubmissions,
  reviewReference,
  reviewPracticeQuestion,
} from '../controllers/moderation.controller.js';

export const moderationRouter: Router = Router();

// Strictly Admin only
moderationRouter.use(authenticate, requireRole([Role.ADMIN]));

moderationRouter.get('/pending', getPendingSubmissions);
moderationRouter.patch('/references/:id/review', reviewReference);
moderationRouter.patch('/practice-questions/:id/review', reviewPracticeQuestion);
