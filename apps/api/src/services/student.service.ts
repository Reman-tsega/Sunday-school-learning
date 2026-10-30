import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import type {
  AdminStudentListItem,
  AdminStudentDetails,
  AdminStudentProgressChapter,
  AdminStudentQuizAttempt,
} from '@eotc/shared';

export interface StudentQueryParams {
  churchParish?: string | undefined;
  parishId?: string | undefined;
  diocese?: string | undefined;
  subCity?: string | undefined;
  gradeId?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class StudentService {
  /**
   * List all students with Sunday School, Grade, and search filters,
   * along with learning progress summary.
   */
  async listStudents(params: StudentQueryParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      role: Role.STUDENT,
    };

    if (params.parishId && params.parishId.trim() !== '') {
      where.parishId = params.parishId.trim();
    }

    if (params.churchParish && params.churchParish.trim() !== '') {
      where.churchParish = {
        equals: params.churchParish.trim(),
        mode: 'insensitive',
      };
    }

    if (params.diocese && params.diocese.trim() !== '') {
      where.parish = {
        diocese: { equals: params.diocese.trim(), mode: 'insensitive' },
      };
    }

    if (params.subCity && params.subCity.trim() !== '') {
      where.parish = {
        ...(where.parish || {}),
        subCity: { equals: params.subCity.trim(), mode: 'insensitive' },
      };
    }

    if (params.gradeId && params.gradeId.trim() !== '') {
      where.enrolledGrades = {
        some: {
          gradeId: params.gradeId.trim(),
        },
      };
    }

    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim();
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { username: { contains: term, mode: 'insensitive' } },
        { baptismalName: { contains: term, mode: 'insensitive' } },
        { phoneNumber: { contains: term, mode: 'insensitive' } },
        { churchParish: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, students, totalChaptersAvailable] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          parish: true,
          enrolledGrades: {
            include: {
              grade: {
                select: {
                  id: true,
                  level: true,
                  name: true,
                  amharicName: true,
                },
              },
            },
          },
          progress: {
            select: {
              isCompleted: true,
              lastStudiedAt: true,
            },
          },
        },
      }),
      prisma.chapter.count({
        where: { isPublished: true },
      }),
    ]);

    const formattedStudents: AdminStudentListItem[] = students.map((s) => {
      const completedCount = s.progress.filter((p) => p.isCompleted).length;
      const progressPercent =
        totalChaptersAvailable > 0
          ? Math.round((completedCount / totalChaptersAvailable) * 100)
          : 0;

      // Find the most recent lastStudiedAt date if any
      let lastActiveAt: string | null = null;
      if (s.progress.length > 0) {
        const sortedDates = s.progress
          .map((p) => p.lastStudiedAt.getTime())
          .sort((a, b) => b - a);
        if (sortedDates[0]) {
          lastActiveAt = new Date(sortedDates[0]).toISOString();
        }
      }

      return {
        id: s.id,
        email: s.email ?? s.username ?? '',
        fullName: s.fullName,
        role: s.role,
        isActive: s.isActive,
        age: s.age,
        address: s.address,
        baptismalName: s.baptismalName,
        phoneNumber: s.phoneNumber,
        churchParish: s.churchParish,
        parishId: s.parishId,
        parish: s.parish
          ? {
              id: s.parish.id,
              name: s.parish.name,
              amharicName: s.parish.amharicName,
              diocese: s.parish.diocese,
              subCity: s.parish.subCity,
              woreda: s.parish.woreda,
              city: s.parish.city,
              sundaySchoolName: s.parish.sundaySchoolName,
              parishType: s.parish.parishType,
              isVerified: s.parish.isVerified,
            }
          : null,
        enrolledGrades: s.enrolledGrades.map((eg) => ({
          id: eg.grade.id,
          gradeLevel: eg.grade.level,
          gradeName: eg.grade.name,
          amharicName: eg.grade.amharicName,
        })),
        totalChaptersCompleted: completedCount,
        totalChaptersAvailable,
        progressPercent,
        lastActiveAt,
        createdAt: s.createdAt.toISOString(),
      };
    });

    return {
      students: formattedStudents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns list of unique Sunday School / Parish churches populated by students.
   */
  async getSundaySchoolsList(): Promise<string[]> {
    const records = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        churchParish: {
          not: null,
        },
      },
      select: {
        churchParish: true,
      },
      distinct: ['churchParish'],
    });

    const list = records
      .map((r) => r.churchParish?.trim())
      .filter((c): c is string => Boolean(c && c.length > 0));

    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Detailed progress breakdown for a single student.
   */
  async getStudentProgressDetails(userId: string): Promise<AdminStudentDetails> {
    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrolledGrades: {
          include: {
            grade: {
              select: {
                id: true,
                level: true,
                name: true,
                amharicName: true,
              },
            },
          },
        },
        progress: true,
      },
    });

    if (!student) {
      throw new AppError(404, 'STUDENT_NOT_FOUND', 'Student record not found');
    }

    const [chapters, quizAttempts, totalChaptersAvailable] = await Promise.all([
      prisma.chapter.findMany({
        where: { isPublished: true },
        include: {
          subject: {
            select: {
              name: true,
              amharicName: true,
              grade: { select: { level: true, name: true } },
            },
          },
          progress: {
            where: { userId },
          },
        },
        orderBy: [
          { subject: { grade: { level: 'asc' } } },
          { chapterNumber: 'asc' },
        ],
      }),
      prisma.quizAttempt.findMany({
        where: { userId },
        include: {
          quiz: {
            select: {
              title: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.chapter.count({
        where: { isPublished: true },
      }),
    ]);

    const chaptersProgress: AdminStudentProgressChapter[] = chapters.map((ch) => {
      const userProg = ch.progress[0];
      return {
        chapterId: ch.id,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        amharicTitle: ch.amharicTitle,
        subjectTitle: ch.subject.name,
        isCompleted: userProg?.isCompleted ?? false,
        lastReadPage: userProg?.lastReadPage ?? 1,
        lastStudiedAt: userProg?.lastStudiedAt ? userProg.lastStudiedAt.toISOString() : null,
      };
    });

    const formattedQuizAttempts: AdminStudentQuizAttempt[] = quizAttempts.map((qa) => ({
      id: qa.id,
      quizId: qa.quizId,
      quizTitle: qa.quiz.title,
      score: qa.score,
      maxScore: qa.maxScore,
      passed: qa.passed,
      attemptedAt: qa.completedAt.toISOString(),
    }));

    const completedCount = chaptersProgress.filter((cp) => cp.isCompleted).length;
    const progressPercent =
      totalChaptersAvailable > 0
        ? Math.round((completedCount / totalChaptersAvailable) * 100)
        : 0;

    const sortedDates = student.progress
      .map((p) => p.lastStudiedAt.getTime())
      .sort((a, b) => b - a);
    const lastActiveAt = sortedDates[0] ? new Date(sortedDates[0]).toISOString() : null;

    return {
      id: student.id,
      email: student.email ?? student.username ?? '',
      fullName: student.fullName,
      role: student.role,
      isActive: student.isActive,
      age: student.age,
      address: student.address,
      baptismalName: student.baptismalName,
      phoneNumber: student.phoneNumber,
      churchParish: student.churchParish,
      enrolledGrades: student.enrolledGrades.map((eg) => ({
        id: eg.grade.id,
        gradeLevel: eg.grade.level,
        gradeName: eg.grade.name,
        amharicName: eg.grade.amharicName,
      })),
      totalChaptersCompleted: completedCount,
      totalChaptersAvailable,
      progressPercent,
      lastActiveAt,
      createdAt: student.createdAt.toISOString(),
      chaptersProgress,
      quizAttempts: formattedQuizAttempts,
    };
  }
}

export const studentService = new StudentService();
