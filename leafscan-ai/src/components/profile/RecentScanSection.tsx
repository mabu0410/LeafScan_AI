import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanHistory } from '../../types';
import { theme } from '../../theme/theme';
import { SeverityBadge } from '../SeverityBadge';

interface RecentScanSectionProps {
  scans: ScanHistory[];
  onPressScan: (scan: ScanHistory) => void;
  onPressViewAll: () => void;
}

function formatScanTime(scan: ScanHistory): string {
  if (!scan.scanDateISO) {
    return scan.date;
  }
  const date = new Date(scan.scanDateISO);
  if (Number.isNaN(date.getTime())) {
    return scan.date;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Vừa xong';
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN');
}

export function RecentScanSection({ scans, onPressScan, onPressViewAll }: RecentScanSectionProps) {
  const recentScans = scans.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử quét gần đây</Text>
        <Pressable onPress={onPressViewAll}>
          <Text style={styles.viewAll}>Xem tất cả</Text>
        </Pressable>
      </View>

      {recentScans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="scan-outline" size={18} color={theme.colors.primaryLight} />
          <Text style={styles.emptyText}>Chưa có dữ liệu quét gần đây.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {recentScans.map((scan) => (
            <Pressable key={scan.id} onPress={() => onPressScan(scan)} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <Image source={{ uri: scan.image }} style={styles.image} />
              <View style={styles.content}>
                <Text style={styles.plantName} numberOfLines={1}>
                  {scan.plantName}
                </Text>
                <Text style={styles.result} numberOfLines={1}>
                  {scan.result}
                </Text>
                <Text style={styles.time}>{formatScanTime(scan)}</Text>
              </View>
              <View style={styles.right}>
                <SeverityBadge severity={scan.severity} size="sm" />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  list: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DEEADF',
    backgroundColor: theme.colors.bgCard,
    ...theme.shadows.card,
  },
  itemPressed: {
    backgroundColor: '#F8FCF9',
  },
  image: {
    width: 54,
    height: 54,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#EAF5ED',
  },
  content: {
    flex: 1,
  },
  plantName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  result: {
    fontSize: 12.5,
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  time: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
  },
  right: {
    paddingLeft: 8,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DEEADF',
    backgroundColor: theme.colors.bgCard,
    padding: 14,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
});
