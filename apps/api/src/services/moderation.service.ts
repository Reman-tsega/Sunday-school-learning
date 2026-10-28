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
        chapter: true,
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
        });
      } catch (err) {
        console.warn('Failed to dispatch question review alert to teacher:', err);
      }
    }

    return updated;
  }
}

export const moderationService = new ModerationService();
