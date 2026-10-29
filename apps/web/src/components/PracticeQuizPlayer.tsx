'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RotateCcw, Award, History, Clock } from 'lucide-react';
import { saveQuizAttempt, getQuizAttempts, saveStudentProgress } from '@/lib/offline-db';
import type { OfflineQuiz, OfflineQuizAttempt } from '@eotc/shared';
import { useLanguage } from '@/lib/language-context';

interface PracticeQuizPlayerProps {
  quiz: OfflineQuiz;
  chapterId?: string;
  userId?: string;
}

export function PracticeQuizPlayer({ quiz, chapterId, userId }: PracticeQuizPlayerProps) {
  const { lang, pick } = useLanguage();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [hasPassed, setHasPassed] = useState<boolean>(false);
  const [pastAttempts, setPastAttempts] = useState<OfflineQuizAttempt[]>([]);
  const [startTime] = useState<string>(new Date().toISOString());

  useEffect(() => {
    loadAttemptHistory();
  }, [quiz.id]);

  const loadAttemptHistory = async () => {
    const attempts = await getQuizAttempts(quiz.id);
    setPastAttempts(attempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()));
  };

  const handleSelectChoice = (questionId: string, choiceId: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
  };

  const handleSubmit = async () => {
    let score = 0;
    let total = 0;

    const answerItems = quiz.questions.map((question) => {
      const selectedId = selectedAnswers[question.id];
      const correctChoice = question.choices.find((c) => c.isCorrect);
      const isCorrect = selectedId !== undefined && correctChoice?.id === selectedId;

      const pointsEarned = isCorrect ? question.points : 0;
      score += pointsEarned;
      total += question.points;

      return {
        questionId: question.id,
        selectedChoiceId: selectedId || '',
        isCorrect,
        pointsEarned,
      };
    });

    const percentScore = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percentScore >= quiz.passingScore;

    setCurrentScore(score);
    setMaxScore(total);
    setHasPassed(passed);
    setIsSubmitted(true);

    // Save to durable IndexedDB offline outbox
    const attemptRecord: OfflineQuizAttempt = {
      clientAttemptUuid: crypto.randomUUID(),
      quizId: quiz.id,
      quizVersion: quiz.version,
      userId: userId || 'offline-student',
      startedAt: startTime,
      completedAt: new Date().toISOString(),
      score,
      maxScore: total,
      passed,
      clientDevice: 'Web PWA',
      isOffline: true,
      answers: answerItems,
      syncState: 'PENDING',
    };

    await saveQuizAttempt(attemptRecord);

    // If student passed the quiz, mark the chapter as completed!
    const targetChapterId = chapterId || (quiz as any).chapterId;
    if (passed && targetChapterId) {
      await saveStudentProgress({
        chapterId: targetChapterId,
        isCompleted: true,
        lastReadPage: 1,
        lastStudiedAt: new Date().toISOString(),
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('eotc:progress-updated', {
            detail: { chapterId: targetChapterId, isCompleted: true },
          })
        );
      }
    }

    await loadAttemptHistory();
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setCurrentScore(0);
  };

  const allAnswered = quiz.questions.every((q) => selectedAnswers[q.id] !== undefined);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quiz Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 p-3.5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 sm:mb-6 border-b border-stone-200 dark:border-slate-800">
          <div>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              {lang === 'am' ? 'የልምምድ ፈተና' : 'Practice Quiz'}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-eotc-navy dark:text-white mt-1">
              {pick(quiz.amharicTitle, quiz.title)}
            </h2>
            {quiz.description && (
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 mt-0.5">{quiz.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] sm:text-xs text-stone-500 dark:text-slate-400 block">
              {lang === 'am' ? 'የማለፊያ ነጥብ' : 'Passing Score'}
            </span>
            <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">{quiz.passingScore}%</span>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4 sm:space-y-6">
          {quiz.questions.map((question, qIdx) => {
            const selectedChoiceId = selectedAnswers[question.id];

            return (
              <div key={question.id} className="p-3.5 sm:p-4 rounded-xl bg-stone-50 dark:bg-slate-950/80 border border-stone-200 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-stone-900 dark:text-white text-sm sm:text-base leading-snug">
                    <span className="text-amber-700 dark:text-amber-400 mr-1.5">
                      {lang === 'am' ? `ጥያቄ ${qIdx + 1}.` : `Question ${qIdx + 1}.`}
                    </span>
                    {pick(question.amharicPrompt, question.prompt)}
                  </h3>
                  <span className="text-[10px] sm:text-xs bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono shrink-0">
                    {question.points} {lang === 'am' ? 'ነጥብ' : 'pts'}
                  </span>
                </div>

                {/* Choices */}
                <div className="mt-3 sm:mt-4 space-y-2">
                  {question.choices.map((choice) => {
                    const isSelected = selectedChoiceId === choice.id;
                    let choiceStyle = 'border-stone-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-white dark:bg-slate-900 text-stone-900 dark:text-white';

                    if (isSubmitted) {
                      if (choice.isCorrect) {
                        choiceStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-medium';
                      } else if (isSelected && !choice.isCorrect) {
                        choiceStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200';
                      } else {
                        choiceStyle = 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-stone-400 dark:text-slate-500 opacity-60';
                      }
                    } else if (isSelected) {
                      choiceStyle = 'border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 font-medium ring-2 ring-amber-500/30';
                    }

                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => handleSelectChoice(question.id, choice.id)}
                        disabled={isSubmitted}
                        className={`w-full text-left px-3.5 py-3 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between min-h-[44px] cursor-pointer ${choiceStyle}`}
                      >
                        <span className="leading-snug">{pick(choice.amharicText, choice.text)}</span>
                        {isSubmitted && choice.isCorrect && (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-2 shrink-0" />
                        )}
                        {isSubmitted && isSelected && !choice.isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 ml-2 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation on submit */}
                {isSubmitted && (question.amharicExplanation || question.explanation) && (
                  <div className="mt-3 p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <span className="font-bold">{lang === 'am' ? 'ማብራሪያ: ' : 'Explanation: '}</span>
                    {pick(question.amharicExplanation, question.explanation)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit or Score Summary */}
        <div className="mt-6 pt-4 border-t border-stone-200 dark:border-slate-800">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="w-full sm:w-auto px-6 py-3 bg-eotc-navy dark:bg-amber-500 dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow transition cursor-pointer"
            >
              {lang === 'am' ? 'መልሶችን አስረክብ' : 'Submit Answers'}
            </button>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-100 dark:bg-slate-950/80 p-3.5 sm:p-4 rounded-xl border border-stone-300 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <Award
                  className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 ${
                    hasPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                    {hasPassed
                      ? (lang === 'am' ? '🎉 እንኳን ደስ አለዎት! አልፈዋል!' : '🎉 Congratulations! You Passed!')
                      : (lang === 'am' ? 'እንደገና ይሞክሩ!' : 'Keep Practicing! Try Again!')}
                  </div>
                  <div className="text-xs sm:text-sm text-stone-600 dark:text-slate-400">
                    {lang === 'am' ? 'ያገኙት ውጤት:' : 'Your Score:'}{' '}
                    <span className="font-bold text-stone-900 dark:text-white">{currentScore} / {maxScore}</span> (
                    {maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0}%)
                  </div>
                </div>
              </div>

              <button
                onClick={handleRetake}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-eotc-gold dark:bg-amber-500 hover:bg-amber-400 text-eotc-navy dark:text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>{lang === 'am' ? 'እንደገና ይፈትኑ' : 'Retake Quiz'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Attempt History */}
      {pastAttempts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 p-3.5 sm:p-6">
          <h3 className="font-bold text-stone-800 dark:text-white text-sm sm:text-base flex items-center space-x-2 mb-3">
            <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{lang === 'am' ? 'ያለፉ የልምምድ ውጤቶች' : 'Attempt History'}</span>
          </h3>

          <div className="space-y-2">
            {pastAttempts.map((att, idx) => (
              <div
                key={att.clientAttemptUuid}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-slate-800 text-xs sm:text-sm bg-stone-50 dark:bg-slate-950/80 gap-2"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs text-stone-400 dark:text-slate-500">#{pastAttempts.length - idx}</span>
                  <span
                    className={`font-bold ${
                      att.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {att.score} / {att.maxScore} {lang === 'am' ? 'ነጥብ' : 'pts'} ({att.maxScore > 0 ? Math.round((att.score / att.maxScore) * 100) : 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-2 text-xs text-stone-500 dark:text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px]">{new Date(att.completedAt).toLocaleDateString()}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-medium">
                    {att.syncState === 'SYNCED'
                      ? (lang === 'am' ? 'የተመሳሰለ' : 'Synced')
                      : (lang === 'am' ? 'ከመስመር ውጭ' : 'Local Offline')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
