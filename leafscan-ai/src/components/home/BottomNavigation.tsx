import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

export function BottomNavigation({
  onPress,
}: {
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.centerButton, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.94, { duration: 110 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
      >
        <View style={styles.centerButtonInner}>
          <Ionicons name="camera" size={28} color={theme.colors.white} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function BottomTabIcon({
  focused,
  iconName,
  color,
  size,
}: {
  focused: boolean;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size: number;
}) {
  const scale = useSharedValue(focused ? 1.08 : 1);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.08 : 1, {
      damping: 14,
      stiffness: 220,
      mass: 0.6,
    });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={iconName} size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.scanButton,
  },
});
