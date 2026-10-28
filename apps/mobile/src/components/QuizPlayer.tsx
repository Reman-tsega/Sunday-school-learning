import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { OfflineQuiz } from '@eotc/shared';
import type { ISqliteDb } from '../database/sqliteDb';
import { quizAttemptRepository } from '../database/sqliteDb';
import { evaluateQuizOffline, saveOfflineQuizAttempt, type QuizEvaluationResult } from '../services/quizService';
import type { QuizAttemptRecord } from '../types';

interface QuizPlayerProps {
  quiz: OfflineQuiz;
  chapterId: string;
  db: ISqliteDb;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, chapterId, db }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizEvaluationResult | null>(null);
  const [pastAttempts, setPastAttempts] = useState<QuizAttemptRecord[]>([]);
  const [startedAt] = useState<string>(new Date().toISOString());

  // Load past attempts for this chapter from SQLite
  useEffect(() => {
    let isMounted = true;
    quizAttemptRepository.getAttemptsByChapter(db, chapterId).then((attempts) => {
      if (isMounted) setPastAttempts(attempts);
    });
    return () => {
      isMounted = false;
    };
  }, [chapterId, db, result]);

  const handleSelectChoice = (questionId: string, choiceId: string) => {
    if (result) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  const handleSubmit = async () => {
    const evalResult = evaluateQuizOffline(quiz, selectedAnswers);
    setResult(evalResult);

    const answersList = Object.entries(selectedAnswers).map(([questionId, selectedChoiceId]) => ({
      questionId,
      selectedChoiceId,
    }));

    await saveOfflineQuizAttempt(db, {
      clientAttemptUuid: evalResult.clientAttemptUuid,
      quizId: quiz.id,
      chapterId,
      score: evalResult.score,
      maxScore: evalResult.maxScore,
      passed: evalResult.passed,
      answers: answersList,
      startedAt,
    });

    const updated = await quizAttemptRepository.getAttemptsByChapter(db, chapterId);
    setPastAttempts(updated);
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setResult(null);
  };

  const allAnswered = quiz.questions.every((q) => Boolean(selectedAnswers[q.id]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Quiz Header */}
      <View style={styles.headerCard}>
        <Text style={styles.quizTitle}>{quiz.title}</Text>
        {quiz.description ? (
          <Text style={styles.instructionsText}>{quiz.description}</Text>
        ) : null}
        <View style={styles.badgeRow}>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>የጥያቄዎች ብዛት: {quiz.questions.length}</Text>
          </View>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>ማለፊያ: {quiz.passingScore}%</Text>
          </View>
        </View>
      </View>

      {/* Result Card if Submitted */}
      {result ? (
        <View style={[styles.resultCard, result.passed ? styles.passedCard : styles.failedCard]}>
          <Text style={styles.resultTitle}>
            {result.passed ? '🎉 እንኳን ደስ አለዎት! አልፈዋል' : '⚠️ አልተሳካም! እንደገና ይሞክሩ'}
          </Text>
          <Text style={styles.resultScore}>
            ውጤት: {result.score} / {result.maxScore} ({result.scorePercent}%)
          </Text>
          <Text style={styles.outboxNotice}>
            ✓ ውጤቱ ከመስመር ውጭ ተመዝግቧል (የተመደበ UUID: {result.clientAttemptUuid.slice(0, 8)}...)
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>🔄 እንደገና ፈተናውን ይውሰዱ</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Questions List */}
      {quiz.questions.map((q, qIndex) => {
        const questionResult = result?.questionResults.find((qr) => qr.questionId === q.id);

        return (
          <View key={q.id} style={styles.questionCard}>
            <Text style={styles.questionNumber}>ጥያቄ {qIndex + 1}</Text>
            <Text style={styles.questionPrompt}>{q.prompt}</Text>

            <View style={styles.choicesList}>
              {q.choices.map((choice, cIndex) => {
                const isSelected = selectedAnswers[q.id] === choice.id;
                const isCorrectChoice = choice.id === questionResult?.correctChoiceId;
                const isWrongSelection = isSelected && !questionResult?.isCorrect;

                return (
                  <TouchableOpacity
                    key={choice.id}
                    style={[
                      styles.choiceButton,
                      isSelected && !result && styles.choiceSelected,
                      result && isCorrectChoice && styles.choiceCorrect,
                      result && isWrongSelection && styles.choiceWrong,
                    ]}
                    onPress={() => handleSelectChoice(q.id, choice.id)}
                    disabled={Boolean(result)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.choiceLetter}>{String.fromCharCode(65 + cIndex)}.</Text>
                    <Text
                      style={[
                        styles.choiceText,
                        isSelected && !result && styles.textSelected,
                        result && isCorrectChoice && styles.textBoldGreen,
                        result && isWrongSelection && styles.textBoldRed,
                      ]}
                    >
                      {choice.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Explanation if shown */}
            {result && (q.explanation || q.amharicExplanation) ? (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>ማብራሪያ:</Text>
                <Text style={styles.explanationText}>
                  {q.explanation || q.amharicExplanation}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}

      {/* Submit Button */}
      {!result ? (
        <TouchableOpacity
          style={[styles.submitButton, !allAnswered && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!allAnswered}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {allAnswered ? '✓ ፈተናውን አስረክብ (Submit Quiz)' : 'እባክዎ ሁሉንም ጥያቄዎች ይመልሱ'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Past Attempts History */}
      {pastAttempts.length > 0 ? (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>የቀደሙ የፈተና ውጤቶች (Attempts History)</Text>
          {pastAttempts.map((att, idx) => (
            <View key={att.clientAttemptUuid} style={styles.historyRow}>
              <View>
                <Text style={styles.historyIndex}>ሙከራ #{pastAttempts.length - idx}</Text>
                <Text style={styles.historyDate}>
                  {new Date(att.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text
                  style={[
                    styles.historyScore,
                    att.passed ? styles.textBoldGreen : styles.textBoldRed,
                  ]}
                >
                  {att.score} / {att.maxScore} ({att.passed ? 'አልፈዋል' : 'ወድቀዋል'})
                </Text>
                <Text style={styles.historySyncState}>
                  {att.syncState === 'SYNCED' ? '✓ ከሰርቨር ጋር ተመሳስሏል' : '⏳ ለመመሳሰል በመጠባበቅ ላይ'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  passedCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  failedCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  outboxNotice: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#92400e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  questionNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  questionPrompt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  choicesList: {
    gap: 8,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  choiceSelected: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
  },
  choiceCorrect: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  choiceWrong: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  choiceLetter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    width: 24,
  },
  choiceText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  textSelected: {
    color: '#92400e',
    fontWeight: 'bold',
  },
  textBoldGreen: {
    color: '#065f46',
    fontWeight: 'bold',
  },
  textBoldRed: {
    color: '#991b1b',
    fontWeight: 'bold',
  },
  explanationBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#065f46',
  },
  explanationText: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#92400e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  historyContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyIndex: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  historyDate: {
    fontSize: 11,
    color: '#64748b',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyScore: {
    fontSize: 13,
  },
  historySyncState: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
