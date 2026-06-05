import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface HistoryHeaderProps {
  totalScans: number;
  searchVisible: boolean;
  onToggleSearch: () => void;
}

export function HistoryHeader({ totalScans, searchVisible, onToggleSearch }: HistoryHeaderProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{t('history.title')}</Text>
        <Text style={styles.subtitle}>{t('history.scanCount', { count: totalScans })}</Text>
      </View>

      <Animated.View style={buttonAnimatedStyle}>
        <Pressable
          onPress={onToggleSearch}
          onPressIn={() => {
            scale.value = withTiming(0.94, { duration: 110 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 160 });
          }}
          style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
        >
          <Ionicons
            name={searchVisible ? 'close-outline' : 'search-outline'}
            size={20}
            color={theme.colors.textPrimary}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#E6E2DB',
    ...theme.shadows.card,
  },
  searchButtonPressed: {
    backgroundColor: '#F7F5F1',
  },
});
