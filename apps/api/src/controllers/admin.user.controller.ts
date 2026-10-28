import type { Request, Response, NextFunction } from 'express';
import {
  CreateUserRequestSchema,
  UpdateUserStatusSchema,
  UpdateUserRoleSchema,
  ResetPasswordSchema,
  UserQuerySchema,
  AssignTeacherParishSchema,
} from '@eotc/shared';
import { userService } from '../services/user.service.js';
import type { ApiResponse, UserProfile } from '@eotc/shared';

export async function createUser(
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = CreateUserRequestSchema.parse(req.body);
    const creatorId = req.user?.id;

    const user = await userService.createUser(validated, creatorId);

    res.status(201).json({
      success: true,
      data: user,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = UserQuerySchema.parse(req.query);
    const result = await userService.getUsers(validated);

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

export async function getUserById(
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
  next: NextFunction
): Promise<void> {
  try {
    const user = await userService.getUserById(req.params.id as string);

    res.status(200).json({
      success: true,
      data: user,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = UpdateUserStatusSchema.parse(req.body);
    const updated = await userService.updateUserStatus(
      req.params.id as string,
      validated.isActive,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      data: updated,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = UpdateUserRoleSchema.parse(req.body);
    const updated = await userService.updateUserRole(
      req.params.id as string,
      validated.role,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      data: updated,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = ResetPasswordSchema.parse(req.body);
    await userService.resetPassword(
      req.params.id as string,
      validated.newPassword,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      data: { message: 'Password reset successfully' },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserParish(
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = AssignTeacherParishSchema.parse(req.body);
    const updated = await userService.updateUserParish(
      req.params.id as string,
      validated.churchParish,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      data: updated,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

