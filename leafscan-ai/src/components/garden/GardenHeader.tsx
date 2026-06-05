import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface GardenHeaderProps {
  title: string;
  subtitle: string;
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  onPressFilter: () => void;
  onPressSort: () => void;
}

function SoftActionButton({
  icon,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.93, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
      >
        <Ionicons name={icon} size={19} color={theme.colors.textPrimary} />
      </Pressable>
    </Animated.View>
  );
}

export function GardenHeader({
  title,
  subtitle,
  searchQuery,
  onChangeSearch,
  onPressFilter,
  onPressSort,
}: GardenHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.actions}>
          <SoftActionButton icon="filter-outline" onPress={onPressFilter} />
          <SoftActionButton icon="swap-vertical-outline" onPress={onPressSort} />
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={onChangeSearch}
          style={styles.searchInput}
          placeholder={t('garden.searchPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: theme.colors.bg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 31,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13.5,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: '#E7E2DC',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  actionButtonPressed: {
    backgroundColor: '#F7F6F3',
  },
  searchWrap: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E2DB',
    backgroundColor: theme.colors.bgCard,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
});
