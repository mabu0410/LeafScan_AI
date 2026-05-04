import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

export interface GardenFilterChipItem {
  id: string;
  label: string;
}

interface GardenFilterChipsProps {
  chips: GardenFilterChipItem[];
  activeChipId: string;
  onSelectChip: (chipId: string) => void;
}

function Chip({
  item,
  active,
  onPress,
}: {
  item: GardenFilterChipItem;
  active: boolean;
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
          scale.value = withTiming(0.96, { duration: 110 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
      >
        <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function GardenFilterChips({
  chips,
  activeChipId,
  onSelectChip,
}: GardenFilterChipsProps) {
  return (
    <View style={styles.container}>
      <FlatList
        data={chips}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Chip item={item} active={activeChipId === item.id} onPress={() => onSelectChip(item.id)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  content: {
    gap: 8,
    paddingRight: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryPale,
    borderColor: theme.colors.primary,
  },
  chipInactive: {
    backgroundColor: '#F2F0EC',
    borderColor: '#E6E1DB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.colors.primary,
  },
  chipTextInactive: {
    color: theme.colors.textSecondary,
  },
});
