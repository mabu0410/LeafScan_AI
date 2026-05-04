import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { theme } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ScanOverlay() {
  const lineY = useSharedValue(0);

  React.useEffect(() => {
    lineY.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedLineStyle = useAnimatedStyle(() => ({
    top: `${lineY.value * 100}%` as any,
  }));

  const frameWidth = SCREEN_WIDTH * 0.8;
  const frameHeight = SCREEN_WIDTH * 0.8;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark overlay */}
      <View style={[styles.overlay, { backgroundColor: 'rgba(247, 244, 239, 0.7)' }]} />

      {/* Scanning frame */}
      <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
        {/* Corner brackets */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />

        {/* Scan line */}
        <Animated.View style={[styles.scanLine, animatedLineStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  frame: {
    position: 'absolute',
    alignSelf: 'center',
    top: '15%',
    borderWidth: 2,
    borderColor: 'rgba(92, 139, 90, 0.3)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 48,
    height: 48,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: theme.colors.primary,
    borderTopLeftRadius: 24,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: theme.colors.primary,
    borderTopRightRadius: 24,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: theme.colors.primary,
    borderBottomLeftRadius: 24,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: theme.colors.primary,
    borderBottomRightRadius: 24,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.colors.primary,
  },
});
