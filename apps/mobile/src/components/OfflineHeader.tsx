import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface OfflineHeaderProps {
  isOffline: boolean;
  onToggleOffline: () => void;
  onOpenDownloads?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  pendingSyncCount?: number;
  title?: string;
}

export const OfflineHeader: React.FC<OfflineHeaderProps> = ({
  isOffline,
  onToggleOffline,
  onOpenDownloads,
  onSync,
  isSyncing = false,
  pendingSyncCount = 0,
  title = 'የሰንበት ትምህርት ቤት (EOTC)',
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Text style={styles.appTitle}>{title}</Text>
        <View style={styles.actionsRow}>
          {onSync && (
            <TouchableOpacity
              style={[
                styles.syncButton,
                isSyncing && styles.syncButtonActive,
                pendingSyncCount > 0 && styles.syncButtonPending,
              ]}
              onPress={onSync}
              disabled={isSyncing || isOffline}
              activeOpacity={0.7}
            >
              <Text style={styles.syncButtonText}>
                {isSyncing
                  ? '🔄 በማመሳሰል...'
                  : pendingSyncCount > 0
                  ? `🔄 ${pendingSyncCount} አመሳስል`
                  : '✓ ተመሳስሏል'}
              </Text>
            </TouchableOpacity>
          )}

          {onOpenDownloads && (
            <TouchableOpacity
              style={styles.storageButton}
              onPress={onOpenDownloads}
              activeOpacity={0.7}
            >
              <Text style={styles.storageButtonText}>💾 የወረዱ</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            isOffline ? styles.statusOffline : styles.statusOnline,
          ]}
        >
          <View
            style={[
              styles.indicatorDot,
              isOffline ? styles.dotOffline : styles.dotOnline,
            ]}
          />
          <Text style={styles.statusText}>
            {isOffline ? 'ከመስመር ውጭ (Offline Mode)' : 'ኦንላይን ተገናኝቷል (Online)'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={onToggleOffline}
          activeOpacity={0.8}
        >
          <Text style={styles.toggleButtonText}>
            {isOffline ? '🌐 ኦንላይን ቀይር' : '✈️ ከመስመር ውጭ ሞክር'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#78350f',
    paddingTop: 45,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#92400e',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appTitle: {
    color: '#fef3c7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  syncButton: {
    backgroundColor: '#92400e',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#b45309',
  },
  syncButtonActive: {
    backgroundColor: '#451a03',
  },
  syncButtonPending: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  storageButton: {
    backgroundColor: '#92400e',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  storageButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOnline: {
    backgroundColor: '#065f46',
  },
  statusOffline: {
    backgroundColor: '#991b1b',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#34d399',
  },
  dotOffline: {
    backgroundColor: '#f87171',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: '#451a03',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#b45309',
  },
  toggleButtonText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
