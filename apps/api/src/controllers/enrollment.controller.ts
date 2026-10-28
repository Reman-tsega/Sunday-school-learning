import type { Request, Response, NextFunction } from 'express';
import { EnrollGradesRequestSchema } from '@eotc/shared';
import { enrollmentService } from '../services/enrollment.service.js';
import type { ApiResponse, StudentEnrollmentItem } from '@eotc/shared';

export async function getStudentEnrollments(
  req: Request,
  res: Response<ApiResponse<StudentEnrollmentItem[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const enrollments = await enrollmentService.getEnrolledGrades(userId);

    res.status(200).json({
      success: true,
      data: enrollments,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function enrollStudentGrades(
  req: Request,
  res: Response<ApiResponse<StudentEnrollmentItem[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const validated = EnrollGradesRequestSchema.parse(req.body);
    const enrollments = await enrollmentService.enrollGrades(userId, validated.gradeIds);

    res.status(200).json({
      success: true,
      data: enrollments,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function unenrollStudentGrade(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { gradeId } = req.params;
    await enrollmentService.unenrollGrade(userId, gradeId!);

    res.status(200).json({
      success: true,
      data: { message: 'Unenrolled from grade successfully' },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
