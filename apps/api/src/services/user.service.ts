import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { UserProfile, UserRole } from '@eotc/shared';

function toUserProfile(user: {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface UserQueryParams {
  role?: UserRole | undefined;
  isActive?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
}

export class UserService {
  async createUser(data: CreateUserData, creatorUserId?: string): Promise<UserProfile> {
    const email = data.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(409, 'EMAIL_EXISTS', 'A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: data.fullName.trim(),
        role: data.role as Role,
        isActive: true,
      },
    });

    // Record audit log
    if (creatorUserId) {
      await prisma.auditLog.create({
        data: {
          userId: creatorUserId,
          action: 'USER_CREATED',
          entity: 'USER',
          entityId: user.id,
          details: { email: user.email, role: user.role, fullName: user.fullName },
        },
      });
    }

    return toUserProfile(user);
  }

  async getUsers(params: UserQueryParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (params.role) {
      where.role = params.role as Role;
    }
    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      users: users.map(toUserProfile),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return toUserProfile(user);
  }

  async updateUserStatus(id: string, isActive: boolean, adminUserId?: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // If deactivating user, immediately revoke all active refresh sessions
    if (!isActive) {
      await prisma.refreshSession.updateMany({
        where: { userId: id },
        data: { isRevoked: true },
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'USER_STATUS_UPDATED',
          entity: 'USER',
          entityId: id,
          details: { previousStatus: user.isActive, newStatus: isActive },
        },
      });
    }

    return toUserProfile(updated);
  }

  async updateUserRole(id: string, newRole: UserRole, adminUserId?: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: newRole as Role },
    });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'USER_ROLE_UPDATED',
          entity: 'USER',
          entityId: id,
          details: { previousRole: user.role, newRole },
        },
      });
    }

    return toUserProfile(updated);
  }

  async resetPassword(id: string, newPassword: string, adminUserId?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Revoke all sessions so the user must log in with their new password
    await prisma.refreshSession.updateMany({
      where: { userId: id },
      data: { isRevoked: true },
    });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'USER_PASSWORD_RESET',
          entity: 'USER',
          entityId: id,
        },
      });
    }
  }
}

export const userService = new UserService();
