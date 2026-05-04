import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface CategoryItem {
  id: string;
  label: string;
}

interface CategoryChipsProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  error?: string;
}

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
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
          scale.value = withTiming(0.95, { duration: 110 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        style={[styles.chip, selected ? styles.chipSelected : styles.chipDefault]}
      >
        {selected ? <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} /> : null}
        <Text style={[styles.chipText, selected ? styles.chipTextSelected : styles.chipTextDefault]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function CategoryChips({
  categories,
  selectedCategory,
  onSelectCategory,
  error,
}: CategoryChipsProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>Danh mục</Text>
      <View style={styles.chipsWrap}>
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.label}
            selected={selectedCategory === category.label}
            onPress={() => onSelectCategory(category.label)}
          />
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.2,
  },
  chipDefault: {
    backgroundColor: '#F2F0EC',
    borderColor: '#E3DED7',
  },
  chipSelected: {
    backgroundColor: '#E9F4EB',
    borderColor: '#8FB58F',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  chipTextDefault: {
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: '#2E6A3A',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.severe,
    fontWeight: '600',
  },
});
