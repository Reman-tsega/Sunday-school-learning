import type { Request, Response, NextFunction } from 'express';
import { teacherService } from '../services/teacher.service.js';
import { CreatePracticeQuestionSchema, SubmitPracticeQuestionBatchSchema } from '@eotc/shared';
import crypto from 'crypto';
import fs from 'fs';
import type { ApiResponse } from '@eotc/shared';

export async function getParishOverview(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const teacherId = req.user!.id;
    const overview = await teacherService.getParishOverview(teacherId);

    res.status(200).json({
      success: true,
      data: overview,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getParishStudents(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const teacherId = req.user!.id;
    const result = await teacherService.getParishStudents(teacherId, {
      search: req.query.search as string | undefined,
      gradeLevel: req.query.gradeLevel ? Number(req.query.gradeLevel) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getStudentParishProgress(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const teacherId = req.user!.id;
    const studentId = req.params.studentId as string;
    const progress = await teacherService.getStudentParishProgress(teacherId, studentId);

    res.status(200).json({
      success: true,
      data: progress,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function submitReferenceMaterial(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const teacherId = req.user!.id;
    const chapterId = req.params.chapterId as string;
    const reference = await teacherService.createReferenceSubmission(teacherId, chapterId, req.body);

    res.status(201).json({
      success: true,
      data: reference,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function submitPracticeQuestion(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const teacherId = req.user!.id;
    const validated = CreatePracticeQuestionSchema.parse(req.body);
    const question = await teacherService.createPracticeQuestionSubmission(teacherId, validated);

    res.status(201).json({
      success: true,
      data: question,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function submitPracticeQuestionBatch(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const teacherId = req.user!.id;
    const validated = SubmitPracticeQuestionBatchSchema.parse(req.body);
    const created = await teacherService.createPracticeQuestionBatch(
      teacherId,
      validated.chapterId,
      validated.questions
    );

    res.status(201).json({
      success: true,
      data: { count: created.length, questions: created },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadReferenceDocument(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'No document was uploaded' },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const checksumSha256 = crypto.createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');
    const host = req.get('host') || 'localhost:4000';

    res.status(200).json({
      success: true,
      data: {
        fileUrl: `${req.protocol}://${host}/uploads/references/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        checksumSha256,
        mimeType: req.file.mimetype,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMySubmissions(
  req: Request,
  res: Response<ApiResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const teacherId = req.user!.id;
    const submissions = await teacherService.getMySubmissions(teacherId);

    res.status(200).json({
      success: true,
      data: submissions,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}
