import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface LevelInfo {
  title: string;
  current: number;
  target: number;
  nextTitle: string;
}

interface BadgeItem {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  earned: boolean;
}

interface AchievementCardProps {
  level: LevelInfo;
  badges: BadgeItem[];
}

export function AchievementCard({ level, badges }: AchievementCardProps) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const progressPercent = level.target > 0 ? Math.min(level.current / level.target, 1) : 0;

  React.useEffect(() => {
    progress.value = withTiming(progressPercent, { duration: 900 });
  }, [progress, progressPercent]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.levelIcon}>
          <Ionicons name="sparkles-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.levelTitle}>{level.title}</Text>
          <Text style={styles.levelSubtitle}>
            {t('profile.levelProgress', {
              current: level.current,
              target: level.target,
              nextTitle: level.nextTitle,
            })}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
        {badges.map((badge) => (
          <View key={badge.id} style={[styles.badge, badge.earned ? styles.badgeEarned : styles.badgeLocked]}>
            <Ionicons
              name={badge.icon}
              size={14}
              color={badge.earned ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[styles.badgeLabel, badge.earned ? styles.badgeLabelEarned : styles.badgeLabelLocked]}>
              {badge.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#DCEBDE',
    ...theme.shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9F6EC',
  },
  textWrap: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  levelSubtitle: {
    fontSize: 12.5,
    color: theme.colors.textSecondary,
  },
  progressTrack: {
    marginTop: 14,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E7F2E8',
  },
  progressFill: {
    width: '0%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4EA86C',
  },
  badgesRow: {
    gap: 8,
    paddingTop: 14,
    paddingRight: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeEarned: {
    backgroundColor: '#EEF8F1',
    borderColor: '#D2EAD9',
  },
  badgeLocked: {
    backgroundColor: '#F6F5F3',
    borderColor: '#E5E0DA',
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeLabelEarned: {
    color: theme.colors.primary,
  },
  badgeLabelLocked: {
    color: theme.colors.textMuted,
  },
});
