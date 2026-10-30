import type { Request, Response, NextFunction } from 'express';
import {
  ChangePasswordRequestSchema,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  ResetPasswordRequestSchema,
  RefreshTokenRequestSchema,
  RegisterRequestSchema,
  UpdateProfileSchema,
} from '@eotc/shared';
import { authService } from '../services/auth.service.js';
import type { ApiResponse, AuthResponseData, UserProfile } from '@eotc/shared';

export async function register(
  req: Request,
  res: Response<ApiResponse<AuthResponseData>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = RegisterRequestSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await authService.register(validated, userAgent, ipAddress);

    res.status(201).json({
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

export async function login(
  req: Request,
  res: Response<ApiResponse<AuthResponseData>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = LoginRequestSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await authService.login(validated.email, validated.password, userAgent, ipAddress);

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

export async function changePassword(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }
    const { currentPassword, newPassword, refreshToken } = ChangePasswordRequestSchema.parse(req.body);
    await authService.changePassword(req.user.id, currentPassword, newPassword, refreshToken);

    res.status(200).json({
      success: true,
      data: { message: 'Password changed successfully' },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = ForgotPasswordRequestSchema.parse(req.body);
    await authService.requestPasswordReset(email);

    // Same answer whether or not the account exists, so emails cannot be enumerated
    res.status(200).json({
      success: true,
      data: { message: 'If an account exists for this email, a password reset link has been sent.' },
      meta: { timestamp: new Date().toISOString() },
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
    const { token, password } = ResetPasswordRequestSchema.parse(req.body);
    await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      data: { message: 'Your password has been reset. You can now sign in.' },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(
  req: Request,
  res: Response<ApiResponse<AuthResponseData>>,
  next: NextFunction
): Promise<void> {
  try {
    const validated = RefreshTokenRequestSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await authService.refreshToken(validated.refreshToken, userAgent, ipAddress);

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

export async function logout(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const refreshTokenStr = req.body.refreshToken as string | undefined;
    if (refreshTokenStr) {
      await authService.logout(refreshTokenStr);
    }

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const userProfile = await authService.getCurrentUser(req.user.id);

    res.status(200).json({
      success: true,
      data: userProfile,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const validated = UpdateProfileSchema.parse(req.body);
    const updatedUser = await authService.updateProfile(req.user.id, validated);

    res.status(200).json({
      success: true,
      data: updatedUser,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

