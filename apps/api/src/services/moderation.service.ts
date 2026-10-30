import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { notificationService } from './notification.service.js';

export class ModerationService {
  /**
   * List all content submissions awaiting admin review
   */
  async getPendingSubmissions() {
    const [references, practiceQuestions] = await Promise.all([
      prisma.referenceLink.findMany({
        where: { status: 'PENDING_REVIEW' },
        orderBy: { createdAt: 'desc' },
        include: {
          chapter: {
            include: {
              subject: {
                include: { grade: true },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              churchParish: true,
            },
          },
        },
      }),
      prisma.practiceQuestion.findMany({
        where: { status: 'PENDING_REVIEW' },
        orderBy: { createdAt: 'desc' },
        include: {
          chapter: {
            include: {
              subject: {
                include: { grade: true },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              churchParish: true,
            },
          },
          choices: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
    ]);

    return {
      totalPending: references.length + practiceQuestions.length,
      references: references.map((r) => ({
        id: r.id,
        chapterId: r.chapterId,
        chapter: {
          id: r.chapter.id,
          title: r.chapter.title,
          amharicTitle: r.chapter.amharicTitle,
          chapterNumber: r.chapter.chapterNumber,
        },
        createdBy: r.createdBy,
        chapterTitle: r.chapter.title,
        amharicChapterTitle: r.chapter.amharicTitle,
        subjectName: r.chapter.subject.name,
        amharicSubjectName: r.chapter.subject.amharicName,
        gradeLevel: r.chapter.subject.grade.level,
        title: r.title,
        amharicTitle: r.amharicTitle,
        url: r.url,
        isDownloadable: r.isDownloadable,
        downloadableDocUrl: r.downloadableDocUrl,
        downloadableDocSize: r.downloadableDocSize,
        status: r.status,
        createdById: r.createdById,
        creatorName: r.createdBy?.fullName || 'Teacher',
        churchParish: r.createdBy?.churchParish || 'Unassigned',
        createdAt: r.createdAt.toISOString(),
      })),
      practiceQuestions: practiceQuestions.map((q) => ({
        id: q.id,
        chapterId: q.chapterId,
        chapter: {
          id: q.chapter.id,
          title: q.chapter.title,
          amharicTitle: q.chapter.amharicTitle,
          chapterNumber: q.chapter.chapterNumber,
        },
        createdBy: q.createdBy,
        chapterTitle: q.chapter.title,
        amharicChapterTitle: q.chapter.amharicTitle,
        subjectName: q.chapter.subject.name,
        amharicSubjectName: q.chapter.subject.amharicName,
        gradeLevel: q.chapter.subject.grade.level,
        questionType: q.questionType,
        prompt: q.prompt,
        amharicPrompt: q.amharicPrompt,
        hasAnswer: q.hasAnswer,
        answerText: q.answerText,
        amharicAnswerText: q.amharicAnswerText,
        explanation: q.explanation,
        amharicExplanation: q.amharicExplanation,
        status: q.status,
        createdById: q.createdById,
        creatorName: q.createdBy?.fullName || 'Teacher',
        churchParish: q.createdBy?.churchParish || 'Unassigned',
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

  /**
   * Admin approves or declines a reference material submission
   */
  async reviewReference(
    adminId: string,
    referenceId: string,
    action: 'APPROVE' | 'DECLINE',
    rejectionReason?: string
  ) {
    const reference = await prisma.referenceLink.findUnique({
      where: { id: referenceId },
      include: {
        createdBy: true,
        chapter: true,
      },
    });

    if (!reference) {
      throw new AppError(404, 'NOT_FOUND', 'Reference submission not found');
    }

    const isApprove = action === 'APPROVE';
    const updated = await prisma.referenceLink.update({
      where: { id: referenceId },
      data: {
        status: isApprove ? 'APPROVED' : 'REJECTED',
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: !isApprove ? rejectionReason || 'Declined during administrative review' : null,
      },
    });

    // Notify the submitting teacher
    if (reference.createdById) {
      try {
        await notificationService.createNotification(adminId, {
          title: isApprove
            ? `Reference Material Approved: ${reference.title}`
            : `Reference Material Needs Revision: ${reference.title}`,
          amharicTitle: isApprove
            ? `የማጣቀሻ ሰነድ ጸድቋል፡ ${reference.amharicTitle || reference.title}`
            : `የማጣቀሻ ሰነድ ማስተካከያ ይፈልጋል፡ ${reference.amharicTitle || reference.title}`,
          content: isApprove
            ? `Your reference "${reference.title}" has been approved and published to Chapter "${reference.chapter.title}".`
            : `Your reference "${reference.title}" was declined. Reason: ${rejectionReason || 'Please review guidelines.'}`,
          amharicContent: isApprove
            ? `ያቀረቡት ማጣቀሻ («${reference.amharicTitle || reference.title}») ጸድቆ ለተማሪዎች ክፍት ሆኗል።`
            : `ያቀረቡት ማጣቀሻ ተቀባይነት አላገኘም። ምክንያት፡ ${rejectionReason || 'እባክዎ መመሪያውን ይመልከቱ።'}`,
          targetType: 'BY_ROLE',
          targetRole: 'TEACHER',
          linkUrl: '/teacher?tab=submissions',
        });
      } catch (err) {
        console.warn('Failed to dispatch review notification to teacher:', err);
      }
    }

    return updated;
  }

  /**
   * Admin approves or declines a practice question submission
   */
  async reviewPracticeQuestion(
    adminId: string,
    questionId: string,
    action: 'APPROVE' | 'DECLINE',
    rejectionReason?: string
  ) {
    const question = await prisma.practiceQuestion.findUnique({
      where: { id: questionId },
      include: {
        createdBy: true,
        chapter: { include: { subject: { include: { grade: true } } } },
      },
    });

    if (!question) {
      throw new AppError(404, 'NOT_FOUND', 'Practice question submission not found');
    }

    const isApprove = action === 'APPROVE';
    const updated = await prisma.practiceQuestion.update({
      where: { id: questionId },
      data: {
        status: isApprove ? 'APPROVED' : 'REJECTED',
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: !isApprove ? rejectionReason || 'Declined during administrative review' : null,
      },
    });

    // Notify submitting teacher
    if (question.createdById) {
      try {
        await notificationService.createNotification(adminId, {
          title: isApprove ? 'Practice Question Approved' : 'Practice Question Needs Revision',
          amharicTitle: isApprove ? 'የልምምድ ጥያቄ ጸድቋል' : 'የልምምድ ጥያቄ ማስተካከያ ይፈልጋል',
          content: isApprove
            ? `Your practice question for "${question.chapter.title}" has been approved.`
            : `Your practice question for "${question.chapter.title}" was declined. Reason: ${rejectionReason || 'Please review question.'}`,
          amharicContent: isApprove
            ? `ለ«${question.chapter.amharicTitle || question.chapter.title}» ያቀረቡት የልምምድ ጥያቄ ጸድቋል።`
            : `ያቀረቡት የልምምድ ጥያቄ ተቀባይነት አላገኘም። ምክንያት፡ ${rejectionReason || 'እባክዎ እንደገና ይመልከቱ።'}`,
          targetType: 'BY_ROLE',
          targetRole: 'TEACHER',
          linkUrl: '/teacher?tab=submissions',
        });
      } catch (err) {
        console.warn('Failed to dispatch question review alert to teacher:', err);
      }
    }

    if (isApprove) {
      await this.notifyStudentsOfNewPractice(adminId, question.chapter);
    }

    return updated;
  }

  /**
   * Tell students of the chapter's grade that new practice drills are available.
   * Approving several questions of one chapter produces a single notification (30 min window).
   */
  private async notifyStudentsOfNewPractice(
    adminId: string,
    chapter: {
      id: string;
      title: string;
      amharicTitle: string | null;
      isPublished: boolean;
      subject: { name: string; amharicName: string | null; grade: { id: string; level: number } };
    }
  ) {
    if (!chapter.isPublished) return;
    try {
      const linkUrl = `/chapters/${chapter.id}?tab=drills`;
      const gradeId = chapter.subject.grade.id;
      const recent = await prisma.notification.findFirst({
        where: {
          linkUrl,
          targetType: 'BY_GRADE',
          targetGradeId: gradeId,
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (recent) return;

      await notificationService.createNotification(adminId, {
        title: `New Practice Questions: ${chapter.title}`,
        amharicTitle: `አዲስ የልምምድ ጥያቄዎች፡ ${chapter.amharicTitle || chapter.title}`,
        content: `New practice drills were added for Grade ${chapter.subject.grade.level} · ${chapter.subject.name} · ${chapter.title}. Tap to try them.`,
        amharicContent: `ለክፍል ${chapter.subject.grade.level} · ${chapter.subject.amharicName || chapter.subject.name} · ${chapter.amharicTitle || chapter.title} አዲስ የልምምድ ጥያቄዎች ተጨምረዋል። ለመሞከር ይንኩ።`,
        targetType: 'BY_GRADE',
        targetGradeId: gradeId,
        linkUrl,
      });
    } catch (err) {
      console.warn('Failed to dispatch student practice notification:', err);
    }
  }
}

export const moderationService = new ModerationService();
