import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { ISqliteDb } from '../database/sqliteDb';
import { packageRepository } from '../database/sqliteDb';
import type { IFileSystem } from '../services/downloadManager';
import { deleteLearningPackage } from '../services/downloadManager';
import type { OfflinePackageRecord } from '../types';

interface DownloadManagerScreenProps {
  db: ISqliteDb;
  fs: IFileSystem;
  onBack: () => void;
}

export const DownloadManagerScreen: React.FC<DownloadManagerScreenProps> = ({
  db,
  fs,
  onBack,
}) => {
  const [packages, setPackages] = useState<OfflinePackageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBytes, setTotalBytes] = useState(0);

  const loadPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const allPkgs = await packageRepository.getAllPackages(db);
      setPackages(allPkgs);

      // Calculate approximate storage used
      let total = 0;
      for (const p of allPkgs) {
        if (p.localPdfUri) {
          const info = await fs.getInfoAsync(p.localPdfUri);
          if (info.exists && info.size) {
            total += info.size;
          }
        }
      }
      setTotalBytes(total);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [db, fs]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleDelete = (pkg: OfflinePackageRecord) => {
    Alert.alert(
      'ትምህርቱን ማጥፋት',
      `"${pkg.title}" የተባለውን ትምህርት ከመሳሪያዎ ላይ ማጥፋት ይፈልጋሉ?`,
      [
        { text: 'ይቅር', style: 'cancel' },
        {
          text: 'አጥፋ',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLearningPackage(db, fs, pkg.chapterId);
              loadPackages();
            } catch (err: any) {
              Alert.alert('ስህተት', err.message || 'ማጥፋት አልተቻለም');
            }
          },
        },
      ]
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>◀ ተመለስ</Text>
        </TouchableOpacity>
        <Text style={styles.navBarTitle}>የወረዱ ትምህርቶች ማስተዳደሪያ (Downloads)</Text>
      </View>

      {/* Storage Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>የወረዱ ምዕራፎች ብዛት</Text>
            <Text style={styles.summaryValue}>{packages.length} ምዕራፍ</Text>
          </View>
          <View style={styles.summaryRightCol}>
            <Text style={styles.summaryLabel}>የተያዘው ቦታ (Disk Usage)</Text>
            <Text style={styles.summaryValue}>{formatSize(totalBytes)}</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#92400e" />
        </View>
      ) : packages.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>ምንም የወረደ ትምህርት የለም</Text>
          <Text style={styles.emptySub}>
            ከሥርዓተ ትምህርቱ ገጽ ላይ ትምህርቶችን በማውረድ ያለ ኢንተርኔት መማር ይችላሉ።
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {packages.map((pkg) => (
            <View key={pkg.chapterId} style={styles.packageCard}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardGradeSubject}>
                  {pkg.manifest.gradeName} · {pkg.manifest.subjectName}
                </Text>
                <Text style={styles.cardTitle}>{pkg.title}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>እትም (Version): v{pkg.version}</Text>
                  <Text style={styles.metaDivider}>•</Text>
                  <Text style={styles.metaText}>
                    ቀን: {new Date(pkg.downloadedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.badgeRow}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      ✓ {pkg.downloadStatus === 'AVAILABLE_OFFLINE' ? 'ከመስመር ውጭ ዝግጁ' : pkg.downloadStatus}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(pkg)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnText}>🗑️ አጥፋ</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    backgroundColor: '#78350f',
    paddingTop: 45,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 10,
  },
  backBtnText: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: 'bold',
  },
  navBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#78350f',
    marginTop: 2,
  },
  summaryRightCol: {
    alignItems: 'flex-end',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  listContainer: {
    padding: 16,
  },
  packageCard: {
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
  cardInfo: {
    flex: 1,
    paddingRight: 10,
  },
  cardGradeSubject: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  metaDivider: {
    marginHorizontal: 6,
    color: '#cbd5e1',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
});
