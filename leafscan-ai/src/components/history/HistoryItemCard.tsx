import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ScanHistory } from '../../types';
import { theme } from '../../theme/theme';

interface HistoryItemCardProps {
  item: ScanHistory;
  index: number;
  onPress: () => void;
}

interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

const BADGE_CONFIG: Record<ScanHistory['severity'], BadgeConfig> = {
  healthy: {
    label: 'Khỏe mạnh',
    bg: '#EAF6EE',
    text: '#2E7D4A',
    border: '#D3E9D9',
  },
  moderate: {
    label: 'Cảnh báo',
    bg: '#FAF0E6',
    text: '#B86A2A',
    border: '#F0DDC8',
  },
  severe: {
    label: 'Nguy hiểm',
    bg: '#FBEAEA',
    text: '#B85C5C',
    border: '#F1D2D6',
  },
};

function getTimeLabel(scan: ScanHistory) {
  if (scan.scanDateISO) {
    const date = new Date(scan.scanDateISO);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    }
  }

  const match = scan.date.match(/\b(\d{2}:\d{2})\b/);
  return match?.[1] || 'Không rõ giờ';
}

export function HistoryItemCard({ item, index, onPress }: HistoryItemCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badge = BADGE_CONFIG[item.severity];
  const confidenceText = `${item.confidence.toFixed(2)}%`;

  return (
    <Animated.View entering={FadeInDown.delay(index * 55).duration(320)}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            scale.value = withTiming(0.985, { duration: 120 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 150 });
          }}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={styles.thumbWrap}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbFallback}>
                <Ionicons name="leaf-outline" size={20} color={theme.colors.primary} />
              </View>
            )}
          </View>

          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={styles.resultText} numberOfLines={1}>
                {item.result}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </View>

            <Text style={styles.plantText} numberOfLines={1}>
              {item.plantName}
            </Text>

            <View style={styles.bottomRow}>
              <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
              <View style={styles.metaRight}>
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                  <Text style={styles.timeText}>{getTimeLabel(item)}</Text>
                </View>
                <Text style={styles.confidenceText}>Độ tin cậy {confidenceText}</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E5E0D9',
    backgroundColor: theme.colors.bgCard,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  cardPressed: {
    backgroundColor: '#F9F7F3',
  },
  thumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EAF5ED',
    marginRight: 11,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  resultText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  plantText: {
    fontSize: 13.5,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  metaRight: {
    alignItems: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
  },
  confidenceText: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
