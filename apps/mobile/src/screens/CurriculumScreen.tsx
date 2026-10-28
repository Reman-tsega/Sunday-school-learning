import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { ISqliteDb } from '../database/sqliteDb';
import type { IFileSystem } from '../services/downloadManager';
import { downloadLearningPackage } from '../services/downloadManager';
import {
  mobileApiClient,
  isOfflineMode,
  setOfflineSimulated,
  type MobileGradeItem,
  type MobileSubjectItem,
  type MobileChapterItem,
} from '../services/api';
import { OfflineHeader } from '../components/OfflineHeader';
import { mobileSyncManager } from '../services/syncManager';

interface CurriculumScreenProps {
  db: ISqliteDb;
  fs: IFileSystem;
  token: string;
  onOpenChapter: (chapterId: string) => void;
  onOpenDownloads: () => void;
  onLogout: () => void;
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  db,
  fs,
  token,
  onOpenChapter,
  onOpenDownloads,
  onLogout,
}) => {
  const [grades, setGrades] = useState<MobileGradeItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [offlineState, setOfflineState] = useState(isOfflineMode());
  const [downloadingChapterId, setDownloadingChapterId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ step: string; percent: number } | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    mobileSyncManager.getPendingCount(db).then(setPendingSyncCount);
    const unsubscribe = mobileSyncManager.subscribe((state) => {
      setPendingSyncCount(state.pendingCount);
      setIsSyncing(state.status === 'syncing');
    });
    return () => unsubscribe();
  }, [db]);

  const handleSync = async () => {
    try {
      await mobileSyncManager.syncNow(db, token);
      Alert.alert('ተሳክቷል!', 'የፈተና ውጤቶችና የንባብ ደረጃ ከሰርቨር ጋር ተመሳስለዋል (Sync complete)');
      loadCurriculum();
    } catch (err: any) {
      Alert.alert('የማመሳሰል ስህተት', err.message || 'ማመሳሰል አልተቻለም');
    }
  };

  const loadCurriculum = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await mobileApiClient.getCurriculum(token, db);
      setGrades(data);
      if (data.length > 0 && selectedLevel === null) {
        setSelectedLevel(data[0]!.level);
      }
    } catch (err: any) {
      Alert.alert('የስህተት መልእክት', err.message || 'ሥርዓተ ትምህርቱን መጫን አልተቻለም');
    } finally {
      setIsLoading(false);
    }
  }, [token, db, selectedLevel]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  const handleToggleOffline = () => {
    const nextVal = !offlineState;
    setOfflineSimulated(nextVal);
    setOfflineState(nextVal);
    loadCurriculum();
  };

  const handleDownloadChapter = async (chapterId: string) => {
    setDownloadingChapterId(chapterId);
    setDownloadProgress({ step: 'በማዘጋጀት ላይ...', percent: 5 });

    try {
      const manifest = await mobileApiClient.getPackageManifest(chapterId, token, db);
      await downloadLearningPackage(db, fs, manifest, (step, percent) => {
        setDownloadProgress({ step, percent });
      });

      Alert.alert('ተሳክቷል!', 'ትምህርቱ ከመስመር ውጭ ዝግጁ ሆኗል (Package downloaded successfully)');
      loadCurriculum();
    } catch (err: any) {
      Alert.alert('ማውረድ አልተቻለም', err.message || 'የውርድ ስህተት ተከስቷል');
    } finally {
      setDownloadingChapterId(null);
      setDownloadProgress(null);
    }
  };

  const currentGrade = grades.find((g) => g.level === selectedLevel) || grades[0];

  return (
    <View style={styles.container}>
      <OfflineHeader
        isOffline={offlineState}
        onToggleOffline={handleToggleOffline}
        onOpenDownloads={onOpenDownloads}
        onSync={handleSync}
        isSyncing={isSyncing}
        pendingSyncCount={pendingSyncCount}
        title="ሥርዓተ ትምህርት (Curriculum)"
      />

      {/* Grade Selector Tabs */}
      {grades.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.gradeTabsBar}
          contentContainerStyle={styles.gradeTabsContent}
        >
          {grades.map((grade) => {
            const isSelected = grade.level === (currentGrade?.level ?? -1);
            return (
              <TouchableOpacity
                key={grade.level}
                style={[styles.gradeTab, isSelected && styles.gradeTabSelected]}
                onPress={() => setSelectedLevel(grade.level)}
                activeOpacity={0.7}
              >
                <Text style={[styles.gradeTabText, isSelected && styles.gradeTabTextSelected]}>
                  {grade.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#92400e" />
          <Text style={styles.loadingText}>ሥርዓተ ትምህርቱን በመጫን ላይ...</Text>
        </View>
      ) : !currentGrade || currentGrade.subjects.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>ምንም የወረደ ትምህርት የለም</Text>
          <Text style={styles.emptySub}>
            ከመስመር ውጭ ለመማር በመጀመሪያ ኦንላይን ሆነው ትምህርቶችን ያውርዱ።
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollList}>
          {currentGrade.subjects.map((subject: MobileSubjectItem) => (
            <View key={subject.id} style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <Text style={styles.subjectBadge}>መጽሐፍ</Text>
                <Text style={styles.subjectName}>{subject.name}</Text>
              </View>

              <View style={styles.chaptersList}>
                {subject.chapters.map((chapter: MobileChapterItem) => {
                  const isAvailableOffline = Boolean(chapter.isAvailableOffline);
                  const isDownloading = downloadingChapterId === chapter.id;

                  return (
                    <View key={chapter.id} style={styles.chapterItem}>
                      <View style={styles.chapterMeta}>
                        <Text style={styles.chapterOrder}>ምዕራፍ {chapter.chapterNumber}</Text>
                        <Text style={styles.chapterTitle}>{chapter.title}</Text>
                        <View style={styles.statusBadgeRow}>
                          <View
                            style={[
                              styles.offlineStatusBadge,
                              isAvailableOffline
                                ? styles.statusBadgeOfflineAvailable
                                : styles.statusBadgeOnlineOnly,
                            ]}
                          >
                            <Text
                              style={[
                                styles.offlineStatusText,
                                isAvailableOffline
                                  ? styles.statusTextGreen
                                  : styles.statusTextGray,
                              ]}
                            >
                              {isAvailableOffline ? '✓ የወረደ (Offline Ready)' : '🌐 ኦንላይን ብቻ'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Action Button */}
                      <View style={styles.chapterActionCol}>
                        {isDownloading ? (
                          <View style={styles.downloadProgressBox}>
                            <ActivityIndicator size="small" color="#92400e" />
                            <Text style={styles.downloadProgressText}>
                              {downloadProgress?.percent}%
                            </Text>
                          </View>
                        ) : isAvailableOffline ? (
                          <TouchableOpacity
                            style={styles.studyButton}
                            onPress={() => onOpenChapter(chapter.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.studyButtonText}>ተማር (Study)</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={() => handleDownloadChapter(chapter.id)}
                            disabled={offlineState}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.downloadButtonText}>
                              {offlineState ? 'ኢንተርኔት ያስፈልጋል' : '📥 አውርድ (Download)'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Logout bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>ይውጡ (Log Out)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  gradeTabsBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    maxHeight: 50,
  },
  gradeTabsContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  gradeTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  gradeTabSelected: {
    backgroundColor: '#78350f',
  },
  gradeTabText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  gradeTabTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 70,
  },
  subjectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  subjectHeader: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  subjectBadge: {
    backgroundColor: '#92400e',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#78350f',
  },
  chaptersList: {
    padding: 12,
  },
  chapterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chapterMeta: {
    flex: 1,
    paddingRight: 12,
  },
  chapterOrder: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginVertical: 2,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  offlineStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeOfflineAvailable: {
    backgroundColor: '#ecfdf5',
  },
  statusBadgeOnlineOnly: {
    backgroundColor: '#f1f5f9',
  },
  offlineStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextGreen: {
    color: '#065f46',
  },
  statusTextGray: {
    color: '#64748b',
  },
  chapterActionCol: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  studyButton: {
    backgroundColor: '#065f46',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  studyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadButton: {
    backgroundColor: '#92400e',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  downloadProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadProgressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
});
