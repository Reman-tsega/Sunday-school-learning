import type { OfflineQuiz, OfflineQuestion, QuizAttemptAnswerItem } from '@eotc/shared';
import type { ISqliteDb } from '../database/sqliteDb';
import { quizAttemptRepository } from '../database/sqliteDb';
import type { QuizAttemptRecord } from '../types';

export interface QuizEvaluationResult {
  clientAttemptUuid: string;
  score: number;
  maxScore: number;
  scorePercent: number;
  passed: boolean;
  questionResults: Array<{
    questionId: string;
    prompt: string;
    selectedChoiceId: string;
    correctChoiceId: string;
    isCorrect: boolean;
    explanation?: string | null;
  }>;
}

export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function evaluateQuizOffline(
  quiz: OfflineQuiz,
  answers: Record<string, string>
): QuizEvaluationResult {
  let score = 0;
  let total = 0;

  const questionResults = quiz.questions.map((question: OfflineQuestion) => {
    const selectedChoiceId = answers[question.id] || '';
    const correctChoice = question.choices.find((c) => c.isCorrect);
    const correctChoiceId = correctChoice?.id || '';
    const isCorrect = selectedChoiceId !== '' && selectedChoiceId === correctChoiceId;

    const pointsEarned = isCorrect ? question.points : 0;
    score += pointsEarned;
    total += question.points;

    return {
      questionId: question.id,
      prompt: question.prompt,
      selectedChoiceId,
      correctChoiceId,
      isCorrect,
      explanation: question.explanation || question.amharicExplanation || null,
    };
  });

  const scorePercent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = scorePercent >= quiz.passingScore;

  return {
    clientAttemptUuid: generateUuid(),
    score,
    maxScore: total,
    scorePercent,
    passed,
    questionResults,
  };
}

export async function saveOfflineQuizAttempt(
  db: ISqliteDb,
  params: {
    clientAttemptUuid?: string;
    quizId: string;
    chapterId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    answers: QuizAttemptAnswerItem[];
    startedAt?: string;
  }
): Promise<QuizAttemptRecord> {
  const now = new Date().toISOString();
  const attemptRecord: QuizAttemptRecord = {
    clientAttemptUuid: params.clientAttemptUuid || generateUuid(),
    quizId: params.quizId,
    chapterId: params.chapterId,
    score: params.score,
    maxScore: params.maxScore,
    passed: params.passed,
    answers: params.answers.map((a) => ({
      questionId: a.questionId,
      selectedChoiceId: a.selectedChoiceId,
    })),
    startedAt: params.startedAt || now,
    completedAt: now,
    syncState: 'PENDING',
    syncedAt: null,
  };

  await quizAttemptRepository.saveAttempt(db, attemptRecord);
  return attemptRecord;
}
