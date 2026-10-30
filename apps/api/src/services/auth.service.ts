import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  calculateRefreshTokenExpiry,
} from '../utils/token.js';
import { env } from '../config/env.js';
import { mailService } from './mail.service.js';
import type { AuthResponseData, UserProfile } from '@eotc/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUserProfile(user: any): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    age: user.age ?? null,
    address: user.address ?? null,
    baptismalName: user.baptismalName ?? null,
    phoneNumber: user.phoneNumber ?? null,
    churchParish: user.churchParish ?? null,
    parishId: user.parishId ?? null,
    enrolledGradeIds: user.enrolledGrades?.map((eg: any) => eg.gradeId) || [],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class AuthService {
  async register(
    data: {
      email: string;
      password: string;
      fullName: string;
      role?: 'ADMIN' | 'TEACHER' | 'STUDENT' | undefined;
      age?: number | null | undefined;
      address?: string | null | undefined;
      baptismalName?: string | null | undefined;
      phoneNumber?: string | null | undefined;
      churchParish?: string | null | undefined;
      parishId?: string | null | undefined;
      gradeIds?: string[] | undefined;
    },
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponseData> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    }

    const { resolvedParishId, resolvedChurchParish } = await this.resolveParish(
      data.parishId,
      data.churchParish,
      data.email.toLowerCase().trim()
    );

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);
    // Public registration can only create students; teachers and admins are assigned by an administrator
    const role = 'STUDENT' as const;

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        fullName: data.fullName.trim(),
        role,
        age: data.age ?? null,
        address: data.address?.trim() ?? null,
        baptismalName: data.baptismalName?.trim() ?? null,
        phoneNumber: data.phoneNumber?.trim() ?? null,
        churchParish: resolvedChurchParish,
        parishId: resolvedParishId,
        ...(data.gradeIds && data.gradeIds.length > 0
          ? {
              enrolledGrades: {
                create: data.gradeIds.map((gradeId) => ({ gradeId })),
              },
            }
          : {}),
      },
      include: {
        enrolledGrades: { select: { gradeId: true } },
      },
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = calculateRefreshTokenExpiry();

    await prisma.refreshSession.create({
      data: {
        tokenHash,
        userId: user.id,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt,
      },
    });

    return {
      user: toUserProfile(user),
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresInSeconds: user.role === 'STUDENT' ? 24 * 3600 : 15 * 60,
      },
    };
  }

  async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponseData> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        enrolledGrades: { select: { gradeId: true } },
      },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Account is deactivated. Please contact an administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Issue tokens
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = calculateRefreshTokenExpiry();

    await prisma.refreshSession.create({
      data: {
        tokenHash,
        userId: user.id,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt,
      },
    });

    return {
      user: toUserProfile(user),
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresInSeconds: user.role === 'STUDENT' ? 24 * 3600 : 15 * 60,
      },
    };
  }

  async refreshToken(
    refreshTokenStr: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponseData> {
    const tokenHash = hashToken(refreshTokenStr);

    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            enrolledGrades: { select: { gradeId: true } },
          },
        },
      },
    });

    if (!session) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token not recognized');
    }

    if (session.isRevoked) {
      // Possible token reuse attempt: Revoke all sessions for this user for security
      await prisma.refreshSession.updateMany({
        where: { userId: session.userId },
        data: { isRevoked: true },
      });
      throw new AppError(401, 'TOKEN_REUSE_DETECTED', 'Session expired or invalid. Please sign in again.');
    }

    if (session.expiresAt < new Date()) {
      throw new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired. Please sign in again.');
    }

    if (!session.user.isActive) {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Account is deactivated');
    }

    // Token rotation: Revoke current session
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Create a new session with new refresh token
    const newRawRefreshToken = generateRefreshTokenString();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = calculateRefreshTokenExpiry();

    await prisma.refreshSession.create({
      data: {
        tokenHash: newTokenHash,
        userId: session.user.id,
        userAgent: userAgent ?? session.userAgent ?? null,
        ipAddress: ipAddress ?? session.ipAddress ?? null,
        expiresAt: newExpiresAt,
      },
    });

    // Issue new access token
    const newAccessToken = generateAccessToken({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      fullName: session.user.fullName,
    });

    return {
      user: toUserProfile(session.user),
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
        expiresInSeconds: session.user.role === 'STUDENT' ? 24 * 3600 : 15 * 60,
      },
    };
  }

  async logout(refreshTokenStr: string): Promise<void> {
    if (!refreshTokenStr) return;
    const tokenHash = hashToken(refreshTokenStr);
    await prisma.refreshSession.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  async getCurrentUser(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrolledGrades: { select: { gradeId: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found or inactive');
    }

    return toUserProfile(user);
  }

  /**
   * Resolve a Sunday School selection: a picked parish id, a typed name matching an existing parish,
   * or a new unverified parish suggested by the user.
   */
  private async resolveParish(
    parishId: string | null | undefined,
    churchParish: string | null | undefined,
    suggestedBy: string
  ): Promise<{ resolvedParishId: string | null; resolvedChurchParish: string | null }> {
    let resolvedParishId: string | null = parishId ?? null;
    let resolvedChurchParish: string | null = churchParish?.trim() || null;

    if (resolvedParishId) {
      const existingParish = await prisma.parish.findUnique({ where: { id: resolvedParishId } });
      if (existingParish) {
        resolvedChurchParish = existingParish.amharicName || existingParish.name;
      } else {
        resolvedParishId = null;
      }
    }

    if (!resolvedParishId && resolvedChurchParish) {
      const matched = await prisma.parish.findFirst({
        where: {
          OR: [
            { name: { equals: resolvedChurchParish, mode: 'insensitive' } },
            { amharicName: { equals: resolvedChurchParish, mode: 'insensitive' } },
            { sundaySchoolName: { equals: resolvedChurchParish, mode: 'insensitive' } },
          ],
        },
      });
      if (matched) {
        resolvedParishId = matched.id;
        resolvedChurchParish = matched.amharicName || matched.name;
      } else {
        try {
          const customParish = await prisma.parish.create({
            data: {
              name: resolvedChurchParish,
              amharicName: resolvedChurchParish,
              diocese: 'Addis Ababa (አዲስ አበባ)',
              city: 'Addis Ababa',
              isVerified: false,
              suggestedBy,
            },
          });
          resolvedParishId = customParish.id;
        } catch {
          // Ignore unique collision
        }
      }
    }

    return { resolvedParishId, resolvedChurchParish };
  }

  async updateProfile(
    userId: string,
    data: {
      fullName?: string | undefined;
      age?: number | null | undefined;
      address?: string | null | undefined;
      baptismalName?: string | null | undefined;
      phoneNumber?: string | null | undefined;
      churchParish?: string | null | undefined;
      parishId?: string | null | undefined;
    }
  ): Promise<UserProfile> {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing || !existing.isActive) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User account not found');
    }

    const updateData: {
      fullName?: string;
      age?: number | null;
      address?: string | null;
      baptismalName?: string | null;
      phoneNumber?: string | null;
      churchParish?: string | null;
      parishId?: string | null;
    } = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.age !== undefined) updateData.age = data.age;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.baptismalName !== undefined) updateData.baptismalName = data.baptismalName?.trim() || null;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber?.trim() || null;
    if (data.churchParish !== undefined || data.parishId !== undefined) {
      const { resolvedParishId, resolvedChurchParish } = await this.resolveParish(
        data.parishId,
        data.churchParish,
        existing.email
      );
      updateData.churchParish = resolvedChurchParish;
      updateData.parishId = resolvedParishId;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        enrolledGrades: { select: { gradeId: true } },
      },
    });

    return toUserProfile(updated);
  }

  /**
   * Starts a password reset. Never reveals whether the email has an account:
   * the caller always gets the same answer and the email is sent in the background.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.isActive) return;

    // Cooldown: at most one email per minute per account
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (recent) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60_000);

    // Only the newest link is valid; only a hash of the token is stored
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({ data: { tokenHash: hashToken(rawToken), userId: user.id, expiresAt } }),
    ]);

    const resetUrl = `${env.WEB_APP_URL.replace(/\/+$/, '')}/reset-password?token=${rawToken}`;
    void mailService.sendPasswordReset(user.email, user.fullName, resetUrl).catch((err) => {
      console.error('Failed to send password reset email:', err instanceof Error ? err.message : err);
    });
  }

  /** Changes the password of a signed-in user after verifying the current one. */
  async changePassword(userId: string, currentPassword: string, newPassword: string, keepRefreshToken?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new AppError(401, 'USER_NOT_FOUND', 'Account not found');
    }

    // 400 (not 401) so the client does not mistake a typo for an expired session
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'The current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new AppError(400, 'PASSWORD_UNCHANGED', 'The new password must be different from the current one');
    }

    const passwordHash = await bcrypt.hash(newPassword, await bcrypt.genSalt(12));
    const keepHash = keepRefreshToken ? hashToken(keepRefreshToken) : null;

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Sign out every other device but keep the one that made the change
      prisma.refreshSession.updateMany({
        where: { userId, isRevoked: false, ...(keepHash ? { tokenHash: { not: keepHash } } : {}) },
        data: { isRevoked: true },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
    ]);

    void mailService.sendPasswordChanged(user.email, user.fullName).catch((err) => {
      console.error('Failed to send password changed email:', err instanceof Error ? err.message : err);
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const invalid = () => new AppError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or has expired. Please request a new one.');
    const tokenHash = hashToken(token);

    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!record || record.usedAt || record.expiresAt <= new Date() || !record.user.isActive) throw invalid();

    const passwordHash = await bcrypt.hash(newPassword, await bcrypt.genSalt(12));

    // Atomically claim the token so two concurrent requests cannot both succeed
    const changed = await prisma.$transaction(async (tx) => {
      const claim = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claim.count !== 1) return false;
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } });
      // Sign the account out everywhere
      await tx.refreshSession.updateMany({ where: { userId: record.userId, isRevoked: false }, data: { isRevoked: true } });
      return true;
    });
    if (!changed) throw invalid();

    void mailService.sendPasswordChanged(record.user.email, record.user.fullName).catch((err) => {
      console.error('Failed to send password changed email:', err instanceof Error ? err.message : err);
    });
  }
}

export const authService = new AuthService();
