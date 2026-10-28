import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import type { LearningPackageManifest } from '@eotc/shared';
import type { ISqliteDb } from '../database/sqliteDb';
import { packageRepository } from '../database/sqliteDb';
import { mobileApiClient, isOfflineMode } from '../services/api';
import { PdfReader } from '../components/PdfReader';
import { QuizPlayer } from '../components/QuizPlayer';

interface ChapterScreenProps {
  chapterId: string;
  token: string;
  db: ISqliteDb;
  onBack: () => void;
}

type TabKey = 'textbook' | 'quiz' | 'references';

export const ChapterScreen: React.FC<ChapterScreenProps> = ({
  chapterId,
  token,
  db,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('textbook');
  const [manifest, setManifest] = useState<LearningPackageManifest | null>(null);
  const [localPdfUri, setLocalPdfUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadChapterData = async () => {
      setIsLoading(true);
      try {
        const localPkg = await packageRepository.getPackage(db, chapterId);
        if (localPkg) {
          if (isMounted) {
            setManifest(localPkg.manifest);
            setLocalPdfUri(localPkg.localPdfUri);
          }
        } else {
          const fetchedManifest = await mobileApiClient.getPackageManifest(chapterId, token, db);
          if (isMounted) setManifest(fetchedManifest);
        }
      } catch (err: any) {
        if (isMounted) setErrorMessage(err.message || 'ትምህርቱን መክፈት አልተቻለም');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadChapterData();
    return () => {
      isMounted = false;
    };
  }, [chapterId, token, db]);

  const handleOpenReference = async (url: string, requiresInternet: boolean) => {
    if (requiresInternet && isOfflineMode()) {
      Alert.alert(
        'ኢንተርኔት ያስፈልጋል',
        'ይህ ማጣቀሻ የውጭ ድረ-ገጽ በመሆኑ ያለ ኢንተርኔት አይከፈትም። (External reference requires internet)'
      );
      return;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('ስህተት', 'አገናኙን መክፈት አልተቻለም');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={styles.loadingText}>ትምህርቱን በመጫን ላይ...</Text>
      </View>
    );
  }

  if (errorMessage || !manifest) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorTitle}>ትምህርቱ አልተገኘም</Text>
        <Text style={styles.errorSub}>{errorMessage || 'መረጃው አልተገኘም'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>ወደ ሥርዓተ ትምህርቱ ተመለስ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryQuiz = manifest.quizzes && manifest.quizzes.length > 0 ? manifest.quizzes[0] : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backIconBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backIconText}>◀ ተመለስ</Text>
        </TouchableOpacity>
        <View style={styles.titleCol}>
          <Text style={styles.navBarTitle} numberOfLines={1}>
            {manifest.chapterTitle}
          </Text>
          <Text style={styles.navBarSub} numberOfLines={1}>
            {manifest.gradeName} · {manifest.subjectName}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'textbook' && styles.tabItemActive]}
          onPress={() => setActiveTab('textbook')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.tabItemText, activeTab === 'textbook' && styles.tabItemTextActive]}
          >
            📖 መማሪያ መጽሐፍ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'quiz' && styles.tabItemActive]}
          onPress={() => setActiveTab('quiz')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.tabItemText, activeTab === 'quiz' && styles.tabItemTextActive]}
          >
            📝 የልምምድ ፈተና
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'references' && styles.tabItemActive]}
          onPress={() => setActiveTab('references')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.tabItemText, activeTab === 'references' && styles.tabItemTextActive]}
          >
            🔗 ማጣቀሻዎች
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.contentArea}>
        {activeTab === 'textbook' && (
          <PdfReader
            chapterId={chapterId}
            chapterTitle={manifest.chapterTitle}
            subjectName={manifest.subjectName}
            startPage={manifest.textbook.startPage}
            endPage={manifest.textbook.endPage}
            totalPages={manifest.textbook.totalPages}
            localPdfUri={localPdfUri}
            downloadUrl={manifest.textbook.fileUrl}
            db={db}
          />
        )}

        {activeTab === 'quiz' && (
          primaryQuiz ? (
            <QuizPlayer quiz={primaryQuiz} chapterId={chapterId} db={db} />
          ) : (
            <View style={styles.centerBox}>
              <Text style={styles.noDataText}>ለዚህ ምዕራፍ የተዘጋጀ ፈተና የለም።</Text>
            </View>
          )
        )}

        {activeTab === 'references' && (
          <ScrollView contentContainerStyle={styles.referencesContainer}>
            <Text style={styles.refHeader}>የምዕራፉ ማጣቀሻ መረጃዎች (Approved References)</Text>
            {manifest.references.length === 0 ? (
              <Text style={styles.noDataText}>ምንም ማጣቀሻ አልተያያዘም።</Text>
            ) : (
              manifest.references.map((ref) => {
                const hasLocalCopy = Boolean(ref.isDownloadable && ref.downloadableDocUrl);
                return (
                  <View key={ref.id} style={styles.refCard}>
                    <View style={styles.refMeta}>
                      <Text style={styles.refTitle}>{ref.title}</Text>
                      {ref.amharicTitle ? (
                        <Text style={styles.refDesc}>{ref.amharicTitle}</Text>
                      ) : null}
                      <View style={styles.refBadgeRow}>
                        <View
                          style={[
                            styles.refBadge,
                            hasLocalCopy ? styles.refBadgeGreen : styles.refBadgeAmber,
                          ]}
                        >
                          <Text
                            style={[
                              styles.refBadgeText,
                              hasLocalCopy ? styles.refBadgeTextGreen : styles.refBadgeTextAmber,
                            ]}
                          >
                            {hasLocalCopy
                              ? '✓ ከመስመር ውጭ የተቀመጠ ፋይል'
                              : '🌐 የውጭ አገናኝ (ኢንተርኔት ይፈልጋል)'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.refActionBtn}
                      onPress={() => handleOpenReference(ref.url, !hasLocalCopy)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.refActionBtnText}>ክፈት ↗</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerBox: {
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
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#92400e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  navBar: {
    backgroundColor: '#78350f',
    paddingTop: 45,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIconBtn: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  backIconText: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: 'bold',
  },
  titleCol: {
    flex: 1,
    marginLeft: 6,
  },
  navBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  navBarSub: {
    color: '#fef3c7',
    fontSize: 11,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#92400e',
  },
  tabItemText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#92400e',
    fontWeight: 'bold',
  },
  contentArea: {
    flex: 1,
  },
  referencesContainer: {
    padding: 16,
  },
  refHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  refCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refMeta: {
    flex: 1,
    paddingRight: 10,
  },
  refTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  refDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  refBadgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  refBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  refBadgeGreen: {
    backgroundColor: '#ecfdf5',
  },
  refBadgeAmber: {
    backgroundColor: '#fffbeb',
  },
  refBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  refBadgeTextGreen: {
    color: '#065f46',
  },
  refBadgeTextAmber: {
    color: '#b45309',
  },
  refActionBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  refActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
});
