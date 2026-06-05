import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { HomeTodayTip } from '../../types/home';

interface TodayTipCardProps {
  tip: HomeTodayTip;
  onPress: () => void;
}

export function TodayTipCard({ tip, onPress }: TodayTipCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.985, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="leaf" size={24} color={theme.colors.primary} />
        </View>

        <View style={styles.content}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tip.category}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {tip.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {tip.summary}
          </Text>
          <View style={styles.readMoreRow}>
            <Text style={styles.readMore}>{t('home.tip.readMore')}</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.accent} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F4EFE6',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    ...theme.shadows.card,
  },
  containerPressed: {
    backgroundColor: '#F0E9DE',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  content: {
    flex: 1,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9F6EC',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  tagText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  title: {
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: 4,
    fontSize: 17,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 13.2,
    lineHeight: 19,
    marginBottom: 8,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readMore: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
