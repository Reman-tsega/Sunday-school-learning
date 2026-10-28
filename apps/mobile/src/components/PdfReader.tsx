import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { ISqliteDb } from '../database/sqliteDb';
import { studentProgressRepository } from '../database/sqliteDb';

interface PdfReaderProps {
  chapterId: string;
  chapterTitle: string;
  subjectName: string;
  startPage: number;
  endPage: number;
  totalPages: number;
  localPdfUri: string | null;
  downloadUrl: string;
  db: ISqliteDb;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  chapterId,
  chapterTitle,
  subjectName,
  startPage,
  endPage,
  totalPages,
  localPdfUri,
  db,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(startPage);
  const [isSavedOffline] = useState<boolean>(Boolean(localPdfUri));

  const totalChapterPages = Math.max(1, endPage - startPage + 1);
  const relativePage = currentPage - startPage + 1;
  const progressPercent = Math.round((relativePage / totalChapterPages) * 100);

  // Load last read page on mount
  useEffect(() => {
    let isMounted = true;
    studentProgressRepository.getProgress(db, chapterId).then((progress) => {
      if (isMounted && progress && progress.lastReadPage >= startPage && progress.lastReadPage <= endPage) {
        setCurrentPage(progress.lastReadPage);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [chapterId, startPage, endPage, db]);

  // Save progress on page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= startPage && newPage <= endPage) {
      setCurrentPage(newPage);
      const isCompleted = newPage === endPage;
      studentProgressRepository.saveProgress(db, chapterId, newPage, isCompleted, 30);
    }
  };

  return (
    <View style={styles.container}>
      {/* Chapter & Page Range Info */}
      <View style={styles.metaCard}>
        <Text style={styles.subjectText}>{subjectName}</Text>
        <Text style={styles.chapterTitle}>{chapterTitle}</Text>
        <View style={styles.rangeBadgeRow}>
          <View style={styles.rangeBadge}>
            <Text style={styles.rangeBadgeText}>
              የምዕራፉ ገጾች: {startPage} - {endPage} (ከ {totalPages} ገጽ)
            </Text>
          </View>
          <View
            style={[
              styles.storageBadge,
              isSavedOffline ? styles.offlineBadgeGreen : styles.offlineBadgeOrange,
            ]}
          >
            <Text style={styles.storageBadgeText}>
              {isSavedOffline ? '✓ ከመስመር ውጭ ዝግጁ' : 'የሚወርድ ፋይል'}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>የንባብ ደረጃ: {progressPercent}%</Text>
      </View>

      {/* Reader Page View */}
      <ScrollView contentContainerStyle={styles.contentScroll}>
        <View style={styles.pagePaper}>
          <View style={styles.pageHeader}>
            <Text style={styles.churchEmblem}>† ኦርቶዶክስ ተዋሕዶ ሰንበት ት/ቤት †</Text>
            <Text style={styles.pageIndicatorTop}>
              ገጽ {currentPage} / {endPage}
            </Text>
          </View>

          <View style={styles.readingArea}>
            <Text style={styles.readingTitle}>
              {chapterTitle} — ክፍል {relativePage}
            </Text>
            <Text style={styles.readingParagraph}>
              ይህ የመማሪያ መጽሐፍ ክፍል በሰንበት ትምህርት ቤት ማኅበራት አንድነት ሥርዓተ ትምህርት መሠረት የተዘጋጀ ነው። ተማሪዎች ትምህርቱን በጥሞና አንብበው ከተረዱ በኋላ በምዕራፉ መጨረሻ የሚገኘውን የልምምድ ፈተና መውሰድ ይችላሉ።
            </Text>
            <Text style={styles.readingParagraph}>
              በዚህ ምዕራፍ የተካተቱ ርእሶች፣ የቤተ ክርስቲያን ታሪክ፣ ሥርዓተ አምልኮ፣ ዜማና ቅዳሴ፣ እንዲሁም መጽሐፍ ቅዱሳዊ ጥናቶች በተመረጡት ገጾች {startPage} እስከ {endPage} ባለው ክልል ውስጥ ተካተዋል።
            </Text>

            {localPdfUri ? (
              <View style={styles.localFileBox}>
                <Text style={styles.localFileLabel}>📂 ከመስመር ውጭ የተቀመጠ ፋይል (Local Storage):</Text>
                <Text style={styles.localFilePath} numberOfLines={2}>
                  {localPdfUri}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.pageFooter}>
            <Text style={styles.pageNumberBottom}>- {currentPage} -</Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation Controls Bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.navButton, currentPage <= startPage && styles.navButtonDisabled]}
          disabled={currentPage <= startPage}
          onPress={() => handlePageChange(currentPage - 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>◀ ያለፈው ገጽ</Text>
        </TouchableOpacity>

        <View style={styles.pageCounterCenter}>
          <Text style={styles.pageCounterCurrent}>{currentPage}</Text>
          <Text style={styles.pageCounterTotal}>/ {endPage}</Text>
        </View>

        <TouchableOpacity
          style={[styles.navButton, currentPage >= endPage && styles.navButtonDisabled]}
          disabled={currentPage >= endPage}
          onPress={() => handlePageChange(currentPage + 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>ቀጣይ ገጽ ▶</Text>
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
  metaCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subjectText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginVertical: 4,
  },
  rangeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rangeBadgeText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  storageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  offlineBadgeGreen: {
    backgroundColor: '#d1fae5',
  },
  offlineBadgeOrange: {
    backgroundColor: '#ffedd5',
  },
  storageBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  progressContainer: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#d97706',
  },
  progressText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  contentScroll: {
    padding: 16,
  },
  pagePaper: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    minHeight: 380,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 16,
  },
  churchEmblem: {
    fontSize: 11,
    color: '#78350f',
    fontWeight: 'bold',
  },
  pageIndicatorTop: {
    fontSize: 11,
    color: '#64748b',
  },
  readingArea: {
    flex: 1,
  },
  readingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  readingParagraph: {
    fontSize: 14,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 14,
  },
  localFileBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
  },
  localFileLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
  },
  localFilePath: {
    fontSize: 10,
    color: '#0284c7',
    marginTop: 4,
  },
  pageFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginTop: 20,
  },
  pageNumberBottom: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  controlsBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navButton: {
    backgroundColor: '#92400e',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  navButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pageCounterCenter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pageCounterCurrent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  pageCounterTotal: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 3,
  },
});
