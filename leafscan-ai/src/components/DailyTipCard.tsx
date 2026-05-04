import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

export function DailyTipCard() {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="leaf" size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Mẹo hôm nay</Text>
        <Text style={styles.description} numberOfLines={2}>
          Tưới nước vào buổi sáng sớm giúp lá khô nhanh, ngăn ngừa nấm bệnh phát triển.
        </Text>
        <Text style={styles.readMore}>Xem thêm</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.moderateBg,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    ...theme.shadows.card,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  content: {
    flex: 1,
  },
  title: {
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 15,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  readMore: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
});
