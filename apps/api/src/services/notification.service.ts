import { prisma } from '../config/prisma.js';
import { Role, NotificationTargetType } from '@prisma/client';
import type { NotificationItem } from '@eotc/shared';

export class NotificationService {
  /**
   * Admin creates and dispatches a notification.
   * Can be BROADCAST, BY_GRADE, or BY_ROLE.
   */
  async createNotification(
    adminUserId: string,
    data: {
      title: string;
      amharicTitle?: string | null;
      content: string;
      amharicContent?: string | null | undefined;
      targetType: NotificationTargetType;
      targetGradeId?: string | null | undefined;
      targetRole?: Role | null | undefined;
    }
  ) {
    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        amharicTitle: data.amharicTitle || null,
        content: data.content,
        amharicContent: data.amharicContent || null,
        targetType: data.targetType,
        targetGradeId: data.targetType === 'BY_GRADE' && data.targetGradeId ? data.targetGradeId : null,
        targetRole: data.targetType === 'BY_ROLE' && data.targetRole ? data.targetRole : null,
        senderId: adminUserId,
      },
      include: {
        targetGrade: { select: { id: true, name: true, amharicName: true, level: true } },
        sender: { select: { fullName: true } },
      },
    });

    return notification;
  }

  /**
   * Admin lists all dispatched notifications with recipient stats.
   */
  async listAdminNotifications() {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        targetGrade: { select: { id: true, name: true, amharicName: true, level: true } },
        sender: { select: { fullName: true } },
        _count: {
          select: {
            recipients: true,
          },
        },
      },
    });

    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      amharicTitle: n.amharicTitle,
      content: n.content,
      amharicContent: n.amharicContent,
      targetType: n.targetType,
      targetGradeId: n.targetGradeId,
      targetGradeName: n.targetGrade
        ? `${n.targetGrade.name}${n.targetGrade.amharicName ? ` (${n.targetGrade.amharicName})` : ''}`
        : null,
      targetRole: n.targetRole,
      senderId: n.senderId,
      senderName: n.sender?.fullName || 'Administrator',
      readCount: n._count.recipients,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  /**
   * Admin deletes a notification.
   */
  async deleteNotification(id: string) {
    return prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Fetches notifications targeted to a specific user (broadcast, their role, or their enrolled grades).
   */
  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrolledGrades: { select: { gradeId: true } },
      },
    });

    if (!user) return [];

    const enrolledGradeIds = user.enrolledGrades.map((e) => e.gradeId);

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetType: NotificationTargetType.BROADCAST },
          { targetType: NotificationTargetType.BY_ROLE, targetRole: user.role },
          ...(enrolledGradeIds.length > 0
            ? [{ targetType: NotificationTargetType.BY_GRADE, targetGradeId: { in: enrolledGradeIds } }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        targetGrade: { select: { id: true, name: true, amharicName: true, level: true } },
        sender: { select: { fullName: true } },
        recipients: {
          where: { userId },
          select: { isRead: true, readAt: true },
        },
      },
    });

    return notifications.map((n) => {
      const recipient = n.recipients[0];
      return {
        id: n.id,
        title: n.title,
        amharicTitle: n.amharicTitle,
        content: n.content,
        amharicContent: n.amharicContent,
        targetType: n.targetType,
        targetGradeId: n.targetGradeId,
        targetGradeName: n.targetGrade
          ? `${n.targetGrade.name}${n.targetGrade.amharicName ? ` (${n.targetGrade.amharicName})` : ''}`
          : null,
        targetRole: n.targetRole,
        senderId: n.senderId,
        senderName: n.sender?.fullName || 'EOTC Admin',
        createdAt: n.createdAt.toISOString(),
        isRead: recipient?.isRead ?? false,
        readAt: recipient?.readAt?.toISOString() ?? null,
      };
    });
  }

  /**
   * Mark a specific notification as read for a user.
   */
  async markAsRead(userId: string, notificationId: string) {
    return prisma.notificationRecipient.upsert({
      where: {
        notificationId_userId: { notificationId, userId },
      },
      create: {
        notificationId,
        userId,
        isRead: true,
        readAt: new Date(),
      },
      update: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    const notifications = await this.getUserNotifications(userId);
    const unread = notifications.filter((n) => !n.isRead);

    await Promise.all(
      unread.map((n) =>
        prisma.notificationRecipient.upsert({
          where: {
            notificationId_userId: { notificationId: n.id, userId },
          },
          create: {
            notificationId: n.id,
            userId,
            isRead: true,
            readAt: new Date(),
          },
          update: {
            isRead: true,
            readAt: new Date(),
          },
        })
      )
    );

    return { markedCount: unread.length };
  }
}

export const notificationService = new NotificationService();
