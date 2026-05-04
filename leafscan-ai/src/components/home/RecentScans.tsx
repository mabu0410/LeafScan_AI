import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanHistory } from '../../types';
import { theme } from '../../theme/theme';
import { SeverityBadge } from '../SeverityBadge';

interface RecentScansProps {
  scans: ScanHistory[];
  onPressViewAll: () => void;
  onPressScan: (scan: ScanHistory) => void;
  onPressFirstScan: () => void;
}

function formatRelativeTime(scan: ScanHistory): string {
  if (!scan.scanDateISO) {
    return scan.date;
  }
  const dt = new Date(scan.scanDateISO);
  if (Number.isNaN(dt.getTime())) {
    return scan.date;
  }

  const now = Date.now();
  const diffMs = now - dt.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (hours < 1) return 'Vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;

  return dt.toLocaleDateString('vi-VN');
}

export function RecentScans({
  scans,
  onPressViewAll,
  onPressScan,
  onPressFirstScan,
}: RecentScansProps) {
  const data = scans.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử gần đây</Text>
        {data.length > 0 ? (
          <Pressable onPress={onPressViewAll}>
            <Text style={styles.seeAll}>Xem tất cả</Text>
          </Pressable>
        ) : null}
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Bạn chưa có lần quét nào</Text>
          <Text style={styles.emptySubtitle}>Quét lá đầu tiên để xem kết quả chẩn đoán tại đây.</Text>
          <Pressable onPress={onPressFirstScan} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Quét ngay</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {data.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onPressScan(item)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <View style={styles.thumbWrap}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons name="leaf-outline" size={18} color={theme.colors.primary} />
                  </View>
                )}
              </View>

              <View style={styles.content}>
                <Text style={styles.plantName} numberOfLines={1}>
                  {item.plantName || 'Cây chưa đặt tên'}
                </Text>
                <Text style={styles.result} numberOfLines={1}>
                  {item.result}
                </Text>
                <Text style={styles.time}>{formatRelativeTime(item)}</Text>
              </View>

              <View style={styles.right}>
                <SeverityBadge severity={item.severity} size="sm" />
                <Text style={styles.confidence}>{item.confidence.toFixed(0)}%</Text>
                <Text style={styles.confLabel}>Độ tin cậy</Text>
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
    paddingHorizontal: 20,
    marginTop: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  seeAll: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E7DF',
    backgroundColor: theme.colors.bgCard,
    padding: 10,
    ...theme.shadows.card,
  },
  itemPressed: {
    backgroundColor: '#F8FCF9',
  },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 13,
    overflow: 'hidden',
    marginRight: 11,
    backgroundColor: '#ECF5EE',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  plantName: {
    fontSize: 14.2,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  result: {
    fontSize: 12.4,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  confidence: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 5,
  },
  confLabel: {
    fontSize: 10.5,
    color: theme.colors.textMuted,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E7DF',
    backgroundColor: theme.colors.bgCard,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAF5ED',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  emptyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryPale,
  },
  emptyButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12.5,
  },
});
