import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface FloatingAddButtonProps {
  onPress: () => void;
  bottomOffset: number;
}

export function FloatingAddButton({ onPress, bottomOffset }: FloatingAddButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle, { bottom: bottomOffset }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.94, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Ionicons name="add" size={30} color={theme.colors.white} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.scanButton,
  },
  buttonPressed: {
    backgroundColor: '#4C774B',
  },
});
