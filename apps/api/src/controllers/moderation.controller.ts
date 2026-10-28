import type { Request, Response, NextFunction } from 'express';
import { moderationService } from '../services/moderation.service.js';
import { ReviewMaterialSchema } from '@eotc/shared';
import type { ApiResponse } from '@eotc/shared';

export async function getPendingSubmissions(
  _req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const pending = await moderationService.getPendingSubmissions();

    res.status(200).json({
      success: true,
      data: pending,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewReference(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = req.user!.id;
    const referenceId = req.params.id as string;
    const validated = ReviewMaterialSchema.parse(req.body);

    const result = await moderationService.reviewReference(
      adminId,
      referenceId,
      validated.action,
      validated.rejectionReason
    );

    res.status(200).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewPracticeQuestion(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = req.user!.id;
    const questionId = req.params.id as string;
    const validated = ReviewMaterialSchema.parse(req.body);

    const result = await moderationService.reviewPracticeQuestion(
      adminId,
      questionId,
      validated.action,
      validated.rejectionReason
    );

    res.status(200).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}
