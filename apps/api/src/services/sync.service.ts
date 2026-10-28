import { prisma } from '../config/prisma.js';
import type {
  BatchSyncRequestSchema,
  SyncQuizAttemptItemSchema,
} from '@eotc/shared';
import type { z } from 'zod';
import type { BatchSyncResponseData, BatchSyncResultItem } from '@eotc/shared';

type BatchSyncInput = z.infer<typeof BatchSyncRequestSchema>;
type SyncAttemptItem = z.infer<typeof SyncQuizAttemptItemSchema>;

export class SyncService {
  async syncBatch(userId: string, input: BatchSyncInput): Promise<BatchSyncResponseData> {
    const results: BatchSyncResultItem[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    // 1. Process Quiz Attempts (Idempotent per clientAttemptUuid)
    for (const attemptItem of input.attempts) {
      try {
        const itemResult = await this.processAttemptItem(userId, attemptItem);
        results.push(itemResult);
        if (itemResult.status === 'SYNCED' || itemResult.status === 'DUPLICATE') {
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          clientAttemptUuid: attemptItem.clientAttemptUuid,
          serverAttemptId: '',
          status: 'REJECTED',
          validatedScore: 0,
          passed: false,
          message: err.message || 'Failed to process attempt',
        });
      }
    }

    // 2. Process Student Progress (Last-write-wins based on lastStudiedAt)
    let progressSynced = 0;
    for (const progressItem of input.progress) {
      try {
        await this.processProgressItem(userId, progressItem);
        progressSynced++;
      } catch (err) {
        // Continue processing other progress items
      }
    }

    return {
      syncedCount,
      failedCount,
      results,
      progressSynced,
    };
  }

  async processAttemptItem(userId: string, item: SyncAttemptItem): Promise<BatchSyncResultItem> {
    // Idempotency check: see if clientAttemptUuid has already been ingested
    const existing = await prisma.quizAttempt.findUnique({
      where: { clientAttemptUuid: item.clientAttemptUuid },
      include: { answers: true },
    });

    if (existing) {
      return {
        clientAttemptUuid: item.clientAttemptUuid,
        serverAttemptId: existing.id,
        status: 'DUPLICATE',
        validatedScore: existing.score,
        passed: existing.passed,
        message: 'Attempt already recorded idempotently',
      };
    }

    // Verify Quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: item.quizId },
      include: {
        questions: {
          include: { choices: true },
        },
      },
    });

    if (!quiz) {
      return {
        clientAttemptUuid: item.clientAttemptUuid,
        serverAttemptId: '',
        status: 'REJECTED',
        validatedScore: 0,
        passed: false,
        message: `Quiz with ID ${item.quizId} not found`,
      };
    }

    // Server-Side Score Validation
    let validatedScore = 0;
    let maxScore = 0;
    const answerRecords: Array<{
      questionId: string;
      selectedChoiceId: string;
      isCorrect: boolean;
      pointsEarned: number;
    }> = [];

    for (const q of quiz.questions) {
      maxScore += q.points;
      const userAns = item.answers.find((a) => a.questionId === q.id);
      const selectedChoice = userAns
        ? q.choices.find((c) => c.id === userAns.selectedChoiceId)
        : null;

      const isCorrect = Boolean(selectedChoice?.isCorrect);
      const pointsEarned = isCorrect ? q.points : 0;
      validatedScore += pointsEarned;

      if (userAns && selectedChoice) {
        answerRecords.push({
          questionId: q.id,
          selectedChoiceId: selectedChoice.id,
          isCorrect,
          pointsEarned,
        });
      }
    }

    const scorePercent = maxScore > 0 ? Math.round((validatedScore / maxScore) * 100) : 0;
    const passed = scorePercent >= quiz.passingScore;

    // Ingest attempt and answers inside transaction
    const newAttempt = await prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({
        data: {
          clientAttemptUuid: item.clientAttemptUuid,
          userId,
          quizId: item.quizId,
          quizVersion: item.quizVersion,
          startedAt: new Date(item.startedAt),
          completedAt: new Date(item.completedAt),
          score: validatedScore,
          maxScore,
          passed,
          clientDevice: item.clientDevice || 'unknown',
          isOffline: item.isOffline ?? true,
          syncedAt: new Date(),
        },
      });

      if (answerRecords.length > 0) {
        await tx.quizAttemptAnswer.createMany({
          data: answerRecords.map((ans) => ({
            attemptId: created.id,
            questionId: ans.questionId,
            selectedChoiceId: ans.selectedChoiceId,
            isCorrect: ans.isCorrect,
            pointsEarned: ans.pointsEarned,
          })),
        });
      }

      // If the student passed the quiz, mark the chapter as completed!
      if (passed && quiz.chapterId) {
        await tx.studentProgress.upsert({
          where: {
            userId_chapterId: { userId, chapterId: quiz.chapterId },
          },
          create: {
            userId,
            chapterId: quiz.chapterId,
            isCompleted: true,
            lastReadPage: 1,
            lastStudiedAt: new Date(),
          },
          update: {
            isCompleted: true,
            lastStudiedAt: new Date(),
          },
        });
      }

      return created;
    });

    return {
      clientAttemptUuid: item.clientAttemptUuid,
      serverAttemptId: newAttempt.id,
      status: 'SYNCED',
      validatedScore,
      passed,
    };
  }

  async processProgressItem(
    userId: string,
    item: {
      chapterId: string;
      isCompleted: boolean;
      lastReadPage: number;
      lastStudiedAt: string;
    }
  ): Promise<void> {
    const existing = await prisma.studentProgress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId: item.chapterId,
        },
      },
    });

    const incomingDate = new Date(item.lastStudiedAt);

    if (existing) {
      // Last-write-wins based on timestamp and highest completed/read status
      if (incomingDate >= existing.lastStudiedAt || item.lastReadPage > existing.lastReadPage) {
        await prisma.studentProgress.update({
          where: { id: existing.id },
          data: {
            lastReadPage: Math.max(item.lastReadPage, existing.lastReadPage),
            isCompleted: item.isCompleted || existing.isCompleted,
            lastStudiedAt: incomingDate,
          },
        });
      }
    } else {
      await prisma.studentProgress.create({
        data: {
          userId,
          chapterId: item.chapterId,
          lastReadPage: item.lastReadPage,
          isCompleted: item.isCompleted,
          lastStudiedAt: incomingDate,
        },
      });
    }
  }

  async pullUpdates(userId: string, sinceIso?: string) {
    const sinceDate = sinceIso ? new Date(sinceIso) : new Date(0);

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        syncedAt: {
          gt: sinceDate,
        },
      },
      include: {
        answers: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    const progress = await prisma.studentProgress.findMany({
      where: {
        userId,
        updatedAt: {
          gt: sinceDate,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      serverTime: new Date().toISOString(),
      attempts: attempts.map((a) => ({
        id: a.id,
        clientAttemptUuid: a.clientAttemptUuid,
        quizId: a.quizId,
        quizVersion: a.quizVersion,
        score: a.score,
        maxScore: a.maxScore,
        passed: a.passed,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt.toISOString(),
        syncedAt: a.syncedAt.toISOString(),
        answers: a.answers.map((ans) => ({
          questionId: ans.questionId,
          selectedChoiceId: ans.selectedChoiceId,
          isCorrect: ans.isCorrect,
          pointsEarned: ans.pointsEarned,
        })),
      })),
      progress: progress.map((p) => ({
        chapterId: p.chapterId,
        lastReadPage: p.lastReadPage,
        isCompleted: p.isCompleted,
        lastStudiedAt: p.lastStudiedAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }
}

export const syncService = new SyncService();
