import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

export type HistoryFilterValue = 'all' | 'healthy' | 'moderate' | 'severe';

interface FilterItem {
  id: HistoryFilterValue;
  label: string;
}

interface HistoryFilterChipsProps {
  activeFilter: HistoryFilterValue;
  onSelectFilter: (value: HistoryFilterValue) => void;
}

const FILTERS: FilterItem[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'healthy', label: 'Khỏe mạnh' },
  { id: 'moderate', label: 'Cảnh báo' },
  { id: 'severe', label: 'Nguy hiểm' },
];

const CHIP_TINT: Record<HistoryFilterValue, { bg: string; border: string; text: string }> = {
  all: { bg: '#F1EFEA', border: '#E4E0D8', text: theme.colors.textSecondary },
  healthy: { bg: '#EAF6EE', border: '#D2E9D7', text: '#2C7B47' },
  moderate: { bg: '#FAF0E6', border: '#F0DDC8', text: '#B86A2A' },
  severe: { bg: '#FBEAEA', border: '#F1D2D6', text: '#B85C5C' },
};

function FilterChip({
  item,
  active,
  onPress,
}: {
  item: FilterItem;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const tint = CHIP_TINT[item.id];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.95, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={[
          styles.chip,
          active
            ? styles.chipActive
            : { backgroundColor: tint.bg, borderColor: tint.border },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            active ? styles.chipTextActive : { color: tint.text },
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function HistoryFilterChips({ activeFilter, onSelectFilter }: HistoryFilterChipsProps) {
  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <FilterChip
            item={item}
            active={item.id === activeFilter}
            onPress={() => onSelectFilter(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  content: {
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.colors.white,
  },
});
