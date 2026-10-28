import type { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/token.js';
import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token required'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token missing'));
  }

  try {
    const payload = verifyAccessToken(token);

    // Verify user exists and is active in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });

    if (!user) {
      return next(new AppError(401, 'USER_NOT_FOUND', 'User does not exist'));
    }

    if (!user.isActive) {
      return next(new AppError(403, 'ACCOUNT_INACTIVE', 'Account has been deactivated'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    next();
  } catch (err) {
    const error = err as Error;
    if (error.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Access token is invalid'));
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}
