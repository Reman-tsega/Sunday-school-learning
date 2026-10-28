import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createAdminNotification,
  listAdminNotifications,
  deleteAdminNotification,
  getStudentNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

export const adminNotificationRouter: Router = Router();
adminNotificationRouter.use(authenticate, requireRole([Role.ADMIN]));

adminNotificationRouter.post('/', createAdminNotification);
adminNotificationRouter.get('/', listAdminNotifications);
adminNotificationRouter.delete('/:id', deleteAdminNotification);

export const notificationRouter: Router = Router();
notificationRouter.use(authenticate);

notificationRouter.get('/', getStudentNotifications);
notificationRouter.patch('/:id/read', markNotificationRead);
notificationRouter.post('/read-all', markAllNotificationsRead);
