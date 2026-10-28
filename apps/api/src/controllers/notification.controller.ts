import type { Request, Response, NextFunction } from 'express';
import { CreateNotificationSchema } from '@eotc/shared';
import { notificationService } from '../services/notification.service.js';
import type { ApiResponse } from '@eotc/shared';

// Admin: Create & Dispatch Notification
export async function createAdminNotification(
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = CreateNotificationSchema.parse(req.body);
    const adminUserId = req.user!.id;

    const notification = await notificationService.createNotification(adminUserId, validated as any);

    res.status(201).json({
      success: true,
      data: notification,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// Admin: List Dispatched Notifications
export async function listAdminNotifications(
  _req: Request,
  res: Response<ApiResponse<any[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const notifications = await notificationService.listAdminNotifications();

    res.status(200).json({
      success: true,
      data: notifications,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// Admin: Delete Notification
export async function deleteAdminNotification(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    await notificationService.deleteNotification(id!);

    res.status(200).json({
      success: true,
      data: { message: 'Notification deleted successfully' },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// Student: Get Relevant Notifications
export async function getStudentNotifications(
  req: Request,
  res: Response<ApiResponse<any[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const notifications = await notificationService.getUserNotifications(userId);

    res.status(200).json({
      success: true,
      data: notifications,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// Student: Mark Notification as Read
export async function markNotificationRead(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await notificationService.markAsRead(userId, id!);

    res.status(200).json({
      success: true,
      data: { message: 'Marked as read' },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// Student: Mark All Notifications as Read
export async function markAllNotificationsRead(
  req: Request,
  res: Response<ApiResponse<{ markedCount: number }>>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
