import type { Request, Response, NextFunction } from 'express';
import { curriculumService } from '../services/curriculum.service.js';
import type { ApiResponse, LearningPackageManifest } from '@eotc/shared';

export async function getStudentCurriculum(
  _req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
) {
  try {
    const curriculum = await curriculumService.getPublishedCurriculum();
    res.status(200).json({
      success: true,
      data: curriculum,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentPackageManifest(
  req: Request,
  res: Response<ApiResponse<LearningPackageManifest>>,
  next: NextFunction
) {
  try {
    const manifest = await curriculumService.getLearningPackageManifest(req.params.chapterId as string);
    res.status(200).json({
      success: true,
      data: manifest,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}
