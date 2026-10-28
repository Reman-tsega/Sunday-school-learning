import { prisma } from '../config/prisma.js';
import type { StudentEnrollmentItem } from '@eotc/shared';

export class EnrollmentService {
  /**
   * Get all grades enrolled by the student.
   */
  async getEnrolledGrades(userId: string): Promise<StudentEnrollmentItem[]> {
    const enrollments = await prisma.studentGradeEnrollment.findMany({
      where: { userId },
      include: {
        grade: true,
      },
      orderBy: { grade: { level: 'asc' } },
    });

    return enrollments.map((e) => ({
      id: e.id,
      gradeId: e.gradeId,
      gradeLevel: e.grade.level,
      gradeName: e.grade.name,
      amharicGradeName: e.grade.amharicName,
      enrolledAt: e.enrolledAt.toISOString(),
    }));
  }

  /**
   * Enroll a student into one or multiple grades.
   */
  async enrollGrades(userId: string, gradeIds: string[]) {
    // Validate grades exist
    const grades = await prisma.grade.findMany({
      where: { id: { in: gradeIds } },
    });

    if (grades.length === 0) {
      throw new Error('None of the specified grades were found');
    }

    const operations = grades.map((g) =>
      prisma.studentGradeEnrollment.upsert({
        where: {
          userId_gradeId: { userId, gradeId: g.id },
        },
        create: {
          userId,
          gradeId: g.id,
        },
        update: {},
      })
    );

    await prisma.$transaction(operations);
    return this.getEnrolledGrades(userId);
  }

  /**
   * Unenroll student from a specific grade.
   */
  async unenrollGrade(userId: string, gradeId: string) {
    await prisma.studentGradeEnrollment.deleteMany({
      where: { userId, gradeId },
    });
    return { success: true };
  }
}

export const enrollmentService = new EnrollmentService();
