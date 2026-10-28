import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiResponse } from '@eotc/shared';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (err instanceof ZodError || (err as { name?: string }).name === 'ZodError') {
    const zodErr = err as ZodError;
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: typeof zodErr.flatten === 'function' ? zodErr.flatten() : (zodErr as unknown as { issues: unknown }).issues,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const error = err as Error;
  console.error('Unhandled server error:', error);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : error.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
