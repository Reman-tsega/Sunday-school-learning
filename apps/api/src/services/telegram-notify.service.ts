import { Prisma, type Notification, type Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { telegramBotService } from './telegram-bot.service.js';

// Telegram allows about 30 messages per second per bot; stay well below it
const SEND_INTERVAL_MS = 50;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
// When Telegram or the network is down, pause the whole queue instead of hammering it
const OUTAGE_PAUSE_MS = 60_000;
// Telegram rejects messages over 4096 characters
const MAX_MESSAGE_LENGTH = 4000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Titles stay on one line so cutting a long message at a line break never splits the bold tag
function boldTitle(text: string): string {
  return `<b>${escapeHtml(text.replace(/\s*\n\s*/g, ' '))}</b>`;
}

/** Bot message for an announcement: Amharic first when there is an Amharic version, then English. */
export function formatAnnouncement(n: Pick<Notification, 'title' | 'amharicTitle' | 'content' | 'amharicContent'>): string {
  const blocks: string[] = [];
  if (n.amharicTitle || n.amharicContent) {
    blocks.push(`${boldTitle(n.amharicTitle || n.title)}\n${escapeHtml(n.amharicContent || n.content)}`);
  }
  blocks.push(`${boldTitle(n.title)}\n${escapeHtml(n.content)}`);
  const text = `📢 ${blocks.join('\n\n— — —\n\n')}`;
  // Cut on a line break so no HTML tag or entity is split
  if (text.length <= MAX_MESSAGE_LENGTH) return text;
  const cut = text.lastIndexOf('\n', MAX_MESSAGE_LENGTH);
  return `${text.slice(0, cut > 0 ? cut : MAX_MESSAGE_LENGTH).replace(/&[a-z]*$/, '')}\n…`;
}

/**
 * Sends announcements to students who use the Telegram app, as bot messages.
 * Deliveries are rows in telegram_deliveries, so anything pending survives a restart; one worker per API process
 * drains them in order.
 */
export class TelegramNotifyService {
  private draining: Promise<void> | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Queues one delivery per Telegram student the announcement targets, then starts sending. */
  async enqueue(notification: Pick<Notification, 'id' | 'targetType' | 'targetGradeId' | 'targetRole'>): Promise<number> {
    if (!env.TELEGRAM_BOT_TOKEN) return 0;

    const where: Prisma.UserWhereInput = {
      telegramId: { not: null },
      isActive: true,
      telegramNotify: true,
      telegramReachable: true,
    };
    if (notification.targetType === 'BY_ROLE') where.role = notification.targetRole as Role;
    if (notification.targetType === 'BY_GRADE') {
      where.enrolledGrades = { some: { gradeId: notification.targetGradeId ?? '' } };
    }

    const users = await prisma.user.findMany({ where, select: { id: true } });
    if (users.length === 0) return 0;

    const { count } = await prisma.telegramDelivery.createMany({
      data: users.map((u) => ({ notificationId: notification.id, userId: u.id })),
      skipDuplicates: true,
    });
    this.kick();
    return count;
  }

  /** Starts the sender if it is idle (also called at startup to resume pending deliveries). */
  kick(): void {
    if (!env.TELEGRAM_BOT_TOKEN || this.draining) return;
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
    this.draining = this.drain()
      .catch((err) => console.error('Telegram announcement sender stopped:', err instanceof Error ? err.message : err))
      .finally(() => {
        this.draining = null;
      });
  }

  /** Resolves when the sender has nothing left to do right now (used by tests). */
  async idle(): Promise<void> {
    while (this.draining) await this.draining;
  }

  private async drain(): Promise<void> {
    for (;;) {
      const batch = await prisma.telegramDelivery.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
        include: {
          notification: true,
          user: { select: { telegramId: true, isActive: true, telegramNotify: true, telegramReachable: true } },
        },
      });
      if (batch.length === 0) return;

      for (const delivery of batch) {
        const outage = await this.deliver(delivery);
        if (outage) {
          this.scheduleResume(OUTAGE_PAUSE_MS);
          return;
        }
        await sleep(SEND_INTERVAL_MS);
      }
    }
  }

  private scheduleResume(delayMs: number): void {
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      this.kick();
    }, delayMs);
    this.resumeTimer.unref?.();
  }

  /** Sends one message. Returns true when Telegram is unreachable and the queue should pause. */
  private async deliver(
    delivery: Prisma.TelegramDeliveryGetPayload<{
      include: {
        notification: true;
        user: { select: { telegramId: true; isActive: true; telegramNotify: true; telegramReachable: true } };
      };
    }>
  ): Promise<boolean> {
    const { user, notification } = delivery;

    // The student may have turned announcements off or been deactivated since it was queued
    if (!user.telegramId || !user.isActive || !user.telegramNotify || !user.telegramReachable) {
      await prisma.telegramDelivery.update({ where: { id: delivery.id }, data: { status: 'SKIPPED' } });
      return false;
    }

    for (;;) {
      const result = await telegramBotService.call('sendMessage', {
        chat_id: user.telegramId.toString(),
        text: formatAnnouncement(notification),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: telegramBotService.openAppKeyboard(true),
      });

      if (result.ok) {
        await prisma.telegramDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
        });
        return false;
      }

      // Too many messages: wait as long as Telegram asks, then try this one again
      if (result.status === 429) {
        await sleep((result.retryAfter ?? 5) * 1000);
        continue;
      }

      // The student blocked the bot, deleted their account or never started a chat with it
      if (result.status === 403 || (result.status === 400 && /chat not found/i.test(result.description ?? ''))) {
        await prisma.$transaction([
          prisma.telegramDelivery.update({
            where: { id: delivery.id },
            data: { status: 'FAILED', attempts: { increment: 1 }, lastError: result.description ?? `HTTP ${result.status}` },
          }),
          prisma.user.updateMany({ where: { telegramId: user.telegramId }, data: { telegramReachable: false } }),
        ]);
        return false;
      }

      const attempts = delivery.attempts + 1;
      const transient = result.status === 0 || result.status >= 500;
      await prisma.telegramDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts,
          lastError: result.description ?? `HTTP ${result.status}`,
          // Other 4xx errors will not fix themselves; transient ones are retried a few times
          ...(!transient || attempts >= MAX_ATTEMPTS ? { status: 'FAILED' as const } : {}),
        },
      });
      return transient && attempts < MAX_ATTEMPTS;
    }
  }

  /** Delivery counts per announcement for the admin list. */
  async statsFor(notificationIds: string[]): Promise<Map<string, { sent: number; pending: number; failed: number }>> {
    const stats = new Map<string, { sent: number; pending: number; failed: number }>();
    if (notificationIds.length === 0) return stats;
    const rows = await prisma.telegramDelivery.groupBy({
      by: ['notificationId', 'status'],
      where: { notificationId: { in: notificationIds } },
      _count: { _all: true },
    });
    for (const row of rows) {
      const s = stats.get(row.notificationId) ?? { sent: 0, pending: 0, failed: 0 };
      if (row.status === 'SENT') s.sent += row._count._all;
      else if (row.status === 'PENDING') s.pending += row._count._all;
      else if (row.status === 'FAILED') s.failed += row._count._all;
      stats.set(row.notificationId, s);
    }
    return stats;
  }
}

export const telegramNotifyService = new TelegramNotifyService();
