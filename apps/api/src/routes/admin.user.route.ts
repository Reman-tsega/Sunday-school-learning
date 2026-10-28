import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createUser,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  resetPassword,
} from '../controllers/admin.user.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

export const adminUserRouter: Router = Router();

// Enforce authentication and Admin-only RBAC on all admin user routes
adminUserRouter.use(authenticate, requireRole([Role.ADMIN]));

adminUserRouter.post('/', createUser);
adminUserRouter.get('/', getUsers);
adminUserRouter.get('/:id', getUserById);
adminUserRouter.patch('/:id/status', updateUserStatus);
adminUserRouter.patch('/:id/role', updateUserRole);
adminUserRouter.post('/:id/reset-password', resetPassword);
