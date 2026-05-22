import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface CompactPlantSelectorProps {
  selectedLabel: string;
  hasSelection: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function CompactPlantSelector({
  selectedLabel,
  hasSelection,
  disabled = false,
  onPress,
}: CompactPlantSelectorProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.6 : 1,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.985, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          !hasSelection && styles.buttonPending,
        ]}
      >
        <View style={styles.textWrap}>
          <View style={styles.row}>
            <Ionicons name="leaf-outline" size={14} color="rgba(223, 255, 236, 0.96)" />
            <Text style={[styles.value, !hasSelection && styles.placeholder]} numberOfLines={1}>
              {selectedLabel}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={16} color="rgba(233, 255, 242, 0.95)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(18, 37, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(210, 255, 229, 0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  buttonPressed: {
    backgroundColor: 'rgba(24, 48, 35, 0.8)',
  },
  buttonPending: {
    borderColor: 'rgba(147, 255, 189, 0.5)',
  },
  textWrap: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(245, 255, 249, 0.98)',
  },
  placeholder: {
    color: 'rgba(207, 241, 219, 0.96)',
  },
});
