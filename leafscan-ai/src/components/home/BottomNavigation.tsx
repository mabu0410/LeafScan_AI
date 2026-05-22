import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
          <Ionicons name="scan-outline" size={30} color={theme.colors.white} />
        </View>
      </Pressable>
      <Text style={styles.centerLabel}>Quét</Text>
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
    <Animated.View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive, animatedStyle]}>
      <Ionicons name={iconName} size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    top: -26,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  centerButtonInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#3EA76A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    ...theme.shadows.scanButton,
  },
  centerLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2F6E4C',
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: 'rgba(92, 139, 90, 0.12)',
  },
});
