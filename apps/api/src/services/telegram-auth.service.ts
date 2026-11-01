import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';
import { hashToken } from '../utils/token.js';
import { TelegramInitDataError, validateTelegramInitData, type TelegramInitDataUser } from '../utils/telegram.js';
import { authService } from './auth.service.js';
import type { TelegramAuthResponseData, TelegramLinkCodeData, TelegramLinkStatus } from '@eotc/shared';

const LINK_CODE_PREFIX = 'link_';
const LINK_CODE_TTL_MINUTES = 15;

const userInclude = { enrolledGrades: { select: { gradeId: true } } } as const;

function requireBotToken(): string {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new AppError(503, 'TELEGRAM_DISABLED', 'Telegram sign-in is not configured on this server');
  }
  return env.TELEGRAM_BOT_TOKEN;
}

function fullNameFrom(tgUser: TelegramInitDataUser): string {
  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim();
  return name || tgUser.username || `Student ${tgUser.id}`;
}

export class TelegramAuthService {
  /**
   * Signs a student in from Mini App launch data. The first launch creates a STUDENT account named
   * after the Telegram profile; a `link_<code>` start parameter attaches Telegram to an existing web account.
   */
  async signIn(initData: string, userAgent?: string, ipAddress?: string): Promise<TelegramAuthResponseData> {
    const botToken = requireBotToken();

    let launch;
    try {
      launch = validateTelegramInitData(initData, botToken, env.TELEGRAM_AUTH_MAX_AGE_SECONDS);
    } catch (err) {
      if (err instanceof TelegramInitDataError) {
        const code = err.reason === 'EXPIRED' ? 'TELEGRAM_INIT_DATA_EXPIRED' : 'TELEGRAM_INIT_DATA_INVALID';
        throw new AppError(401, code, err.message);
      }
      throw err;
    }

    const telegramId = BigInt(launch.user.id);
    let linkStatus: TelegramLinkStatus | undefined;

    if (launch.startParam?.startsWith(LINK_CODE_PREFIX)) {
      linkStatus = await this.linkWithCode(launch.startParam.slice(LINK_CODE_PREFIX.length), launch.user);
    }

    let isNewUser = false;
    let user = await prisma.user.findUnique({ where: { telegramId }, include: userInclude });

    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            fullName: fullNameFrom(launch.user),
            role: 'STUDENT',
            passwordHash: null,
            telegramId,
            telegramUsername: launch.user.username ?? null,
            telegramLinkedAt: new Date(),
          },
          include: userInclude,
        });
        isNewUser = true;
      } catch (err) {
        // Two first launches raced (e.g. a double tap); the other request created the account
        if ((err as { code?: string }).code !== 'P2002') throw err;
        user = await prisma.user.findUniqueOrThrow({ where: { telegramId }, include: userInclude });
      }
    } else if ((launch.user.username ?? null) !== user.telegramUsername) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { telegramUsername: launch.user.username ?? null },
        include: userInclude,
      });
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Account is deactivated. Please contact an administrator.');
    }
    if (user.role !== 'STUDENT') {
      throw new AppError(403, 'TELEGRAM_STUDENTS_ONLY', 'The Telegram app is for students. Please use the website.');
    }

    const session = await authService.issueSession(user, userAgent, ipAddress);
    return { ...session, isNewUser, ...(linkStatus ? { linkStatus } : {}) };
  }

  /** Creates a one-time code a signed-in web student opens in Telegram to link their account. */
  async createLinkCode(userId: string): Promise<TelegramLinkCodeData> {
    requireBotToken();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found or inactive');
    }
    if (user.role !== 'STUDENT') {
      throw new AppError(403, 'TELEGRAM_STUDENTS_ONLY', 'Only student accounts can be linked to Telegram');
    }

    // 16 random bytes in base64url: 22 characters, inside Telegram's 64-character start parameter limit
    const code = crypto.randomBytes(16).toString('base64url');
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60_000);

    // Only the newest code is valid; only its hash is stored
    await prisma.$transaction([
      prisma.telegramLinkCode.deleteMany({ where: { userId } }),
      prisma.telegramLinkCode.create({ data: { codeHash: hashToken(code), userId, expiresAt } }),
    ]);

    return {
      deepLink: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?startapp=${LINK_CODE_PREFIX}${code}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /** Detaches Telegram from a web account. Accounts without a password would be locked out, so they cannot. */
  async unlink(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    if (!user.passwordHash) {
      throw new AppError(400, 'NO_PASSWORD', 'This account signs in only with Telegram and cannot be unlinked');
    }
    await prisma.user.update({
      where: { id: userId },
      data: { telegramId: null, telegramUsername: null, telegramLinkedAt: null },
    });
  }

  /**
   * Attaches the Telegram identity to the account that issued the code. If the student already had a
   * Telegram-only account, its learning data is merged into the web account and the empty shell is deleted.
   * Problems are reported as a status (not an error) so the student is still signed in.
   */
  private async linkWithCode(code: string, tgUser: TelegramInitDataUser): Promise<TelegramLinkStatus> {
    const telegramId = BigInt(tgUser.id);

    return prisma.$transaction(async (tx) => {
      const record = await tx.telegramLinkCode.findUnique({
        where: { codeHash: hashToken(code) },
        include: { user: true },
      });
      const target = record?.user;

      // Re-opening the same link after it worked (e.g. a reload) is not an error
      if (record?.usedAt && target?.telegramId === telegramId) return 'LINKED';
      if (!record || !target || record.usedAt || record.expiresAt <= new Date()) return 'TELEGRAM_LINK_INVALID';
      if (!target.isActive || target.role !== 'STUDENT') return 'TELEGRAM_LINK_INVALID';
      if (target.telegramId != null && target.telegramId !== telegramId) return 'TELEGRAM_ALREADY_LINKED';

      const current = await tx.user.findUnique({ where: { telegramId } });
      if (current && current.id !== target.id) {
        // The Telegram account already belongs to a different web account
        if (current.passwordHash) return 'TELEGRAM_IN_USE';
        await this.mergeInto(tx, current.id, target.id);
      }

      await tx.user.update({
        where: { id: target.id },
        data: { telegramId, telegramUsername: tgUser.username ?? null, telegramLinkedAt: new Date() },
      });
      await tx.telegramLinkCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      return 'LINKED';
    });
  }

  /** Moves everything a Telegram-only student did into `toId`, then deletes the Telegram-only account. */
  private async mergeInto(tx: Prisma.TransactionClient, fromId: string, toId: string): Promise<void> {
    const [from, to] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: fromId }, include: { enrolledGrades: true } }),
      tx.user.findUniqueOrThrow({ where: { id: toId } }),
    ]);

    // Quiz attempts are unique by clientAttemptUuid, so they simply move
    await tx.quizAttempt.updateMany({ where: { userId: fromId }, data: { userId: toId } });

    // Progress per chapter: keep the furthest reading position and any completion
    const fromProgress = await tx.studentProgress.findMany({ where: { userId: fromId } });
    for (const p of fromProgress) {
      const existing = await tx.studentProgress.findUnique({
        where: { userId_chapterId: { userId: toId, chapterId: p.chapterId } },
      });
      if (!existing) {
        await tx.studentProgress.update({ where: { id: p.id }, data: { userId: toId } });
        continue;
      }
      await tx.studentProgress.update({
        where: { id: existing.id },
        data: {
          isCompleted: existing.isCompleted || p.isCompleted,
          lastReadPage: Math.max(existing.lastReadPage, p.lastReadPage),
          lastStudiedAt: existing.lastStudiedAt > p.lastStudiedAt ? existing.lastStudiedAt : p.lastStudiedAt,
        },
      });
    }

    await tx.studentGradeEnrollment.createMany({
      data: from.enrolledGrades.map((e) => ({ userId: toId, gradeId: e.gradeId })),
      skipDuplicates: true,
    });

    // Notifications the web account does not have yet keep their read state
    const toNotificationIds = (
      await tx.notificationRecipient.findMany({ where: { userId: toId }, select: { notificationId: true } })
    ).map((r) => r.notificationId);
    await tx.notificationRecipient.updateMany({
      where: { userId: fromId, notificationId: { notIn: toNotificationIds } },
      data: { userId: toId },
    });

    await tx.supportTicket.updateMany({ where: { userId: fromId }, data: { userId: toId } });
    await tx.ticketMessage.updateMany({ where: { senderId: fromId }, data: { senderId: toId } });

    // Profile details the student filled in through Telegram fill gaps in the web profile, never overwrite it
    await tx.user.update({
      where: { id: toId },
      data: {
        age: to.age ?? from.age,
        address: to.address ?? from.address,
        baptismalName: to.baptismalName ?? from.baptismalName,
        phoneNumber: to.phoneNumber ?? from.phoneNumber,
        churchParish: to.churchParish ?? from.churchParish,
        parishId: to.parishId ?? from.parishId,
      },
    });

    // Remaining rows (sessions, duplicate enrollments/progress/notifications) cascade with the account
    await tx.user.delete({ where: { id: fromId } });
  }
}

export const telegramAuthService = new TelegramAuthService();
