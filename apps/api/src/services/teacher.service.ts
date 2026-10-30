import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { notificationService } from './notification.service.js';
import type { CreatePracticeQuestionInput } from '@eotc/shared';

export class TeacherService {
  /**
   * Helper to resolve teacher and enforce Sunday School parish assignment
   */
  async getTeacherAndParish(teacherId: string) {
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        churchParish: true,
      },
    });

    if (!teacher) {
      throw new AppError(404, 'NOT_FOUND', 'Teacher account not found');
    }

    if (teacher.role !== 'TEACHER' && teacher.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'User is not a teacher or administrator');
    }

    if (!teacher.churchParish && teacher.role !== 'ADMIN') {
      throw new AppError(
        400,
        'NO_PARISH_ASSIGNED',
        'You have not yet been assigned to a Sunday School parish by an administrator. Please contact your parish administrator.'
      );
    }

    return teacher;
  }

  /**
   * Get overall stats for the teacher's Sunday School
   */
  async getParishOverview(teacherId: string) {
    const teacher = await this.getTeacherAndParish(teacherId);
    const parish = teacher.churchParish;

    const studentWhere = parish ? { role: 'STUDENT' as const, churchParish: parish } : { role: 'STUDENT' as const };

    const totalStudents = await prisma.user.count({
      where: studentWhere,
    });

    // Students with progress records
    const activeStudentsCount = await prisma.user.count({
      where: {
        ...studentWhere,
        progress: { some: {} },
      },
    });

    // Total completed chapters by parish students
    const completedChaptersCount = await prisma.studentProgress.count({
      where: {
        isCompleted: true,
        user: studentWhere,
      },
    });

    // Teacher's submissions count
    const [pendingRefs, approvedRefs, pendingQuestions, approvedQuestions] = await Promise.all([
      prisma.referenceLink.count({ where: { createdById: teacherId, status: 'PENDING_REVIEW' } }),
      prisma.referenceLink.count({ where: { createdById: teacherId, status: 'APPROVED' } }),
      prisma.practiceQuestion.count({ where: { createdById: teacherId, status: 'PENDING_REVIEW' } }),
      prisma.practiceQuestion.count({ where: { createdById: teacherId, status: 'APPROVED' } }),
    ]);

    // Fetch recent 5 students in this parish
    const recentStudentsRaw = await prisma.user.findMany({
      where: studentWhere,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        enrolledGrades: {
          include: {
            grade: true,
          },
        },
        progress: {
          where: { isCompleted: true },
        },
      },
    });

    const totalAvailableChapters = await prisma.chapter.count({ where: { isPublished: true } });

    const recentStudents = recentStudentsRaw.map((s) => ({
      id: s.id,
      email: s.email,
      fullName: s.fullName,
      role: s.role,
      isActive: s.isActive,
      age: s.age,
      address: s.address,
      baptismalName: s.baptismalName,
      phoneNumber: s.phoneNumber,
      churchParish: s.churchParish,
      enrolledGrades: s.enrolledGrades.map((eg) => ({
        id: eg.grade.id,
        gradeLevel: eg.grade.level,
        gradeName: eg.grade.name,
        amharicName: eg.grade.amharicName,
      })),
      totalChaptersCompleted: s.progress.length,
      totalChaptersAvailable: totalAvailableChapters,
      progressPercent: totalAvailableChapters > 0 ? Math.round((s.progress.length / totalAvailableChapters) * 100) : 0,
      lastActiveAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return {
      churchParish: parish || 'All Parishes (Admin View)',
      totalStudents,
      activeStudents: activeStudentsCount,
      completedChaptersCount,
      pendingSubmissionsCount: pendingRefs + pendingQuestions,
      approvedSubmissionsCount: approvedRefs + approvedQuestions,
      recentStudents,
    };
  }

  /**
   * List students belonging strictly to the teacher's Sunday school parish
   */
  async getParishStudents(
    teacherId: string,
    query: {
      search?: string | undefined;
      gradeLevel?: number | undefined;
      page?: number | undefined;
      limit?: number | undefined;
    }
  ) {
    const teacher = await this.getTeacherAndParish(teacherId);
    const parish = teacher.churchParish;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      role: 'STUDENT',
      ...(parish ? { churchParish: parish } : {}),
    };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { baptismalName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phoneNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.gradeLevel) {
      where.enrolledGrades = {
        some: {
          grade: {
            level: Number(query.gradeLevel),
          },
        },
      };
    }

    const [total, students] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          enrolledGrades: {
            include: {
              grade: true,
            },
          },
          progress: {
            where: { isCompleted: true },
          },
        },
      }),
    ]);

    const totalAvailableChapters = await prisma.chapter.count({ where: { isPublished: true } });

    const items = students.map((s) => ({
      id: s.id,
      email: s.email,
      fullName: s.fullName,
      role: s.role,
      isActive: s.isActive,
      age: s.age,
      address: s.address,
      baptismalName: s.baptismalName,
      phoneNumber: s.phoneNumber,
      churchParish: s.churchParish,
      enrolledGrades: s.enrolledGrades.map((eg) => ({
        id: eg.grade.id,
        gradeLevel: eg.grade.level,
        gradeName: eg.grade.name,
        amharicName: eg.grade.amharicName,
      })),
      totalChaptersCompleted: s.progress.length,
      totalChaptersAvailable: totalAvailableChapters,
      progressPercent: totalAvailableChapters > 0 ? Math.round((s.progress.length / totalAvailableChapters) * 100) : 0,
      lastActiveAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      churchParish: parish || 'All Parishes',
    };
  }

  /**
   * Get detailed progress of a student, ensuring student belongs to the teacher's Sunday school
   */
  async getStudentParishProgress(teacherId: string, studentId: string) {
    const teacher = await this.getTeacherAndParish(teacherId);

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        enrolledGrades: {
          include: { grade: true },
        },
        progress: {
          include: {
            chapter: {
              include: {
                subject: {
                  include: { grade: true },
                },
              },
            },
          },
          orderBy: { lastStudiedAt: 'desc' },
        },
        quizAttempts: {
          include: {
            quiz: {
              include: {
                chapter: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new AppError(404, 'NOT_FOUND', 'Student not found');
    }

    // Parish security check: teacher can only inspect their own parish's students
    if (teacher.role !== 'ADMIN' && student.churchParish !== teacher.churchParish) {
      throw new AppError(
        403,
        'FORBIDDEN',
        `Access denied. Student belongs to "${student.churchParish || 'Unassigned'}", not "${teacher.churchParish}".`
      );
    }

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        baptismalName: student.baptismalName,
        churchParish: student.churchParish,
        age: student.age,
        phoneNumber: student.phoneNumber,
        createdAt: student.createdAt.toISOString(),
      },
      enrolledGrades: student.enrolledGrades.map((eg) => ({
        id: eg.grade.id,
        level: eg.grade.level,
        name: eg.grade.name,
        amharicName: eg.grade.amharicName,
      })),
      chaptersProgress: student.progress.map((p) => ({
        chapterId: p.chapterId,
        chapterNumber: p.chapter.chapterNumber,
        title: p.chapter.title,
        amharicTitle: p.chapter.amharicTitle,
        subjectTitle: p.chapter.subject.name,
        gradeLevel: p.chapter.subject.grade.level,
        isCompleted: p.isCompleted,
        lastReadPage: p.lastReadPage,
        lastStudiedAt: p.lastStudiedAt.toISOString(),
      })),
      quizAttempts: student.quizAttempts.map((qa) => ({
        id: qa.id,
        quizId: qa.quizId,
        quizTitle: qa.quiz.title,
        chapterTitle: qa.quiz.chapter.title,
        score: qa.score,
        maxScore: qa.maxScore,
        passed: qa.passed,
        attemptedAt: qa.completedAt.toISOString(),
      })),
    };
  }

  /**
   * Teacher submits a reference link/document for admin review
   */
  async createReferenceSubmission(
    teacherId: string,
    chapterId: string,
    data: {
      title: string;
      amharicTitle?: string | null;
      url: string;
      isDownloadable?: boolean;
      downloadableDocUrl?: string | null;
      downloadableDocSize?: number | null;
      downloadableDocChecksum?: string | null;
      orderIndex?: number;
    }
  ) {
    const teacher = await this.getTeacherAndParish(teacherId);

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        subject: {
          include: { grade: true },
        },
      },
    });

    if (!chapter) {
      throw new AppError(404, 'NOT_FOUND', 'Chapter not found');
    }

    const isAdmin = teacher.role === 'ADMIN';

    // An uploaded document replaces the external link
    const resolvedUrl = data.url || data.downloadableDocUrl;
    if (!resolvedUrl) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Provide either a document link or an uploaded document');
    }

    const reference = await prisma.referenceLink.create({
      data: {
        chapterId,
        title: data.title,
        amharicTitle: data.amharicTitle ?? null,
        url: resolvedUrl,
        isDownloadable: data.isDownloadable ?? !data.url,
        downloadableDocUrl: data.downloadableDocUrl ?? null,
        downloadableDocSize: data.downloadableDocSize ?? null,
        downloadableDocChecksum: data.downloadableDocChecksum ?? null,
        orderIndex: data.orderIndex ?? 0,
        status: isAdmin ? 'APPROVED' : 'PENDING_REVIEW',
        createdById: teacherId,
        reviewedById: isAdmin ? teacherId : null,
        reviewedAt: isAdmin ? new Date() : null,
      },
    });

    if (!isAdmin) {
      // Notify administrators
      try {
        await notificationService.createNotification(teacherId, {
          title: `New Reference Submission: ${data.title}`,
          amharicTitle: `አዲስ የማጣቀሻ ሰነድ ይሁንታ ይጠብቃል፡ ${data.amharicTitle || data.title}`,
          content: `Teacher ${teacher.fullName} (${teacher.churchParish || 'Sunday School not set'}) submitted a reference document.
Grade ${chapter.subject.grade.level} · ${chapter.subject.name} · ${chapter.title}`,
          amharicContent: `መምህር ${teacher.fullName} (${teacher.churchParish || 'ሰንበት ት/ቤት ያልተመዘገበ'}) አዲስ የማጣቀሻ ሰነድ አቅርበዋል።
ክፍል ${chapter.subject.grade.level} · ${chapter.subject.amharicName || chapter.subject.name} · ${chapter.amharicTitle || chapter.title}`,
          targetType: 'BY_ROLE',
          targetRole: 'ADMIN',
          linkUrl: '/admin/moderation?tab=references',
        });
      } catch (e) {
        console.warn('Failed to dispatch moderation notification to admins:', e);
      }
    }

    return reference;
  }

  /**
   * Teacher or Admin submits a practice question (auto-approved if Admin)
   */
  async createPracticeQuestionSubmission(
    teacherId: string,
    data: CreatePracticeQuestionInput,
    options: { notify?: boolean } = {}
  ) {
    const notify = options.notify ?? true;
    const teacher = await this.getTeacherAndParish(teacherId);

    const chapter = await prisma.chapter.findUnique({
      where: { id: data.chapterId },
      include: {
        subject: {
          include: { grade: true },
        },
      },
    });

    if (!chapter) {
      throw new AppError(404, 'NOT_FOUND', 'Chapter not found');
    }

    const isAdmin = teacher.role === 'ADMIN';

    const createData: any = {
      chapterId: data.chapterId,
      questionType: data.questionType,
      prompt: data.prompt,
      amharicPrompt: data.amharicPrompt ?? null,
      orderIndex: data.orderIndex ?? 0,
      hasAnswer: data.hasAnswer ?? true,
      answerText: data.answerText ?? null,
      amharicAnswerText: data.amharicAnswerText ?? null,
      explanation: data.explanation ?? null,
      amharicExplanation: data.amharicExplanation ?? null,
      status: isAdmin ? 'APPROVED' : 'PENDING_REVIEW',
      createdById: teacherId,
      reviewedById: isAdmin ? teacherId : null,
      reviewedAt: isAdmin ? new Date() : null,
    };

    if (data.choices && data.choices.length > 0) {
      createData.choices = {
        create: data.choices.map((c, idx) => ({
          text: c.text,
          amharicText: c.amharicText ?? null,
          orderIndex: c.orderIndex ?? idx + 1,
          isCorrect: c.isCorrect ?? false,
        })),
      };
    }

    const question = await prisma.practiceQuestion.create({
      data: createData,
      include: {
        choices: true,
      },
    });

    if (!isAdmin && notify) {
      // Notify administrators
      try {
        await notificationService.createNotification(teacherId, {
          title: `New Practice Question Pending Review`,
          amharicTitle: `አዲስ የልምምድ ጥያቄ ይሁንታ ይጠብቃል`,
          content: `Teacher ${teacher.fullName} (${teacher.churchParish || 'Sunday School not set'}) submitted a practice question.
Grade ${chapter.subject.grade.level} · ${chapter.subject.name} · ${chapter.title}`,
          amharicContent: `መምህር ${teacher.fullName} (${teacher.churchParish || 'ሰንበት ት/ቤት ያልተመዘገበ'}) አዲስ የልምምድ ጥያቄ አቅርበዋል።
ክፍል ${chapter.subject.grade.level} · ${chapter.subject.amharicName || chapter.subject.name} · ${chapter.amharicTitle || chapter.title}`,
          targetType: 'BY_ROLE',
          targetRole: 'ADMIN',
          linkUrl: '/admin/moderation?tab=questions',
        });
      } catch (e) {
        console.warn('Failed to dispatch practice question moderation alert:', e);
      }
    }

    return question;
  }

  /**
   * Teacher sends a prepared set of practice questions for one chapter in a single review request.
   * All questions are stored together and admins receive exactly one notification.
   */
  async createPracticeQuestionBatch(
    teacherId: string,
    chapterId: string,
    questions: Array<Omit<CreatePracticeQuestionInput, 'chapterId'>>
  ) {
    const teacher = await this.getTeacherAndParish(teacherId);
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { grade: true } } },
    });
    if (!chapter) {
      throw new AppError(404, 'NOT_FOUND', 'Chapter not found');
    }

    const created = [];
    for (const [idx, q] of questions.entries()) {
      created.push(
        await this.createPracticeQuestionSubmission(
          teacherId,
          { ...q, chapterId, orderIndex: q.orderIndex ?? idx },
          { notify: false }
        )
      );
    }

    if (teacher.role !== 'ADMIN') {
      try {
        const n = created.length;
        await notificationService.createNotification(teacherId, {
          title: `New Practice Questions Pending Review (${n})`,
          amharicTitle: `${n} አዲስ የልምምድ ጥያቄዎች ይሁንታ ይጠብቃሉ`,
          content: `Teacher ${teacher.fullName} (${teacher.churchParish || 'Sunday School not set'}) sent ${n} practice question${n === 1 ? '' : 's'} for review.
Grade ${chapter.subject.grade.level} · ${chapter.subject.name} · ${chapter.title}`,
          amharicContent: `መምህር ${teacher.fullName} (${teacher.churchParish || 'ሰንበት ት/ቤት ያልተመዘገበ'}) ${n} የልምምድ ጥያቄዎችን ለግምገማ ልከዋል።
ክፍል ${chapter.subject.grade.level} · ${chapter.subject.amharicName || chapter.subject.name} · ${chapter.amharicTitle || chapter.title}`,
          targetType: 'BY_ROLE',
          targetRole: 'ADMIN',
          linkUrl: '/admin/moderation?tab=questions',
        });
      } catch (e) {
        console.warn('Failed to dispatch practice question moderation alert:', e);
      }
    }

    return created;
  }

  /**
   * List all submissions made by the teacher with approval/rejection feedback
   */
  async getMySubmissions(teacherId: string) {
    const [references, questions] = await Promise.all([
      prisma.referenceLink.findMany({
        where: { createdById: teacherId },
        orderBy: { createdAt: 'desc' },
        include: {
          chapter: {
            include: {
              subject: {
                include: { grade: true },
              },
            },
          },
        },
      }),
      prisma.practiceQuestion.findMany({
        where: { createdById: teacherId },
        orderBy: { createdAt: 'desc' },
        include: {
          chapter: {
            include: {
              subject: {
                include: { grade: true },
              },
            },
          },
          choices: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
    ]);

    return {
      references: references.map((r) => ({
        id: r.id,
        chapterId: r.chapterId,
        chapterTitle: r.chapter.title,
        gradeLevel: r.chapter.subject.grade.level,
        subjectName: r.chapter.subject.name,
        title: r.title,
        amharicTitle: r.amharicTitle,
        url: r.url,
        isDownloadable: r.isDownloadable,
        downloadableDocUrl: r.downloadableDocUrl,
        downloadableDocSize: r.downloadableDocSize,
        status: r.status,
        rejectionReason: r.rejectionReason,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      practiceQuestions: questions.map((q) => ({
        id: q.id,
        chapterId: q.chapterId,
        chapterTitle: q.chapter.title,
        gradeLevel: q.chapter.subject.grade.level,
        subjectName: q.chapter.subject.name,
        questionType: q.questionType,
        prompt: q.prompt,
        amharicPrompt: q.amharicPrompt,
        hasAnswer: q.hasAnswer,
        answerText: q.answerText,
        amharicAnswerText: q.amharicAnswerText,
        explanation: q.explanation,
        amharicExplanation: q.amharicExplanation,
        status: q.status,
        rejectionReason: q.rejectionReason,
        reviewedAt: q.reviewedAt?.toISOString() ?? null,
        createdAt: q.createdAt.toISOString(),
        choices: q.choices.map((c) => ({
          id: c.id,
          text: c.text,
          amharicText: c.amharicText,
          orderIndex: c.orderIndex,
          isCorrect: c.isCorrect,
        })),
      })),
    };
  }
}

export const teacherService = new TeacherService();
