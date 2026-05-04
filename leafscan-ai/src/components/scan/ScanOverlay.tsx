import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../../theme/theme';
import { ScanState } from './types';

interface ScanOverlayProps {
  state: ScanState;
  topInset: number;
  bottomInset: number;
}

const MIN_FRAME_WIDTH = 280;
const MAX_FRAME_WIDTH = 360;

export function ScanOverlay({ state, topInset, bottomInset }: ScanOverlayProps) {
  const { width, height } = useWindowDimensions();

  const frameWidth = Math.min(Math.max(width * 0.82, MIN_FRAME_WIDTH), MAX_FRAME_WIDTH);
  const frameHeight = frameWidth * 1.02;
  const suggestedTop = topInset + Math.max(96, height * 0.14);
  const maxTop = height - bottomInset - frameHeight - 220;
  const frameTop = Math.max(topInset + 92, Math.min(suggestedTop, maxTop));
  const frameLeft = (width - frameWidth) / 2;

  const lineProgress = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const cornerEmphasis = useSharedValue(state === 'optimal' ? 1 : 0.35);

  React.useEffect(() => {
    lineProgress.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [glowPulse, lineProgress]);

  React.useEffect(() => {
    if (state === 'optimal') {
      cornerEmphasis.value = withTiming(1, { duration: 320 });
      return;
    }
    if (state === 'processing') {
      cornerEmphasis.value = withTiming(0.62, { duration: 280 });
      return;
    }
    cornerEmphasis.value = withTiming(0.35, { duration: 280 });
  }, [cornerEmphasis, state]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lineProgress.value * (frameHeight - 8) }],
    opacity: state === 'processing' ? 0.65 : 0.95,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.32 + glowPulse.value * 0.38,
  }));

  const cornerHighlightStyle = useAnimatedStyle(() => ({
    opacity: cornerEmphasis.value,
  }));

  const overlayTopHeight = frameTop;
  const overlayBottomTop = frameTop + frameHeight;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: overlayTopHeight }]} />
      <View style={[styles.overlay, { top: frameTop, left: 0, width: frameLeft, height: frameHeight }]} />
      <View
        style={[
          styles.overlay,
          { top: frameTop, right: 0, width: frameLeft, height: frameHeight },
        ]}
      />
      <View style={[styles.overlay, { top: overlayBottomTop, left: 0, right: 0, bottom: 0 }]} />

      <View style={[styles.frame, { top: frameTop, left: frameLeft, width: frameWidth, height: frameHeight }]}>
        <Animated.View style={[styles.frameGlow, glowStyle]} />

        <Animated.View style={[styles.scanLine, scanLineStyle]}>
          <LinearGradient
            colors={['rgba(118, 245, 171, 0)', 'rgba(167, 255, 207, 0.98)', 'rgba(118, 245, 171, 0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.scanGradient}
          />
        </Animated.View>

        <View style={[styles.corner, styles.cornerTopLeft]} />
        <View style={[styles.corner, styles.cornerTopRight]} />
        <View style={[styles.corner, styles.cornerBottomLeft]} />
        <View style={[styles.corner, styles.cornerBottomRight]} />

        <Animated.View style={[styles.cornerHighlight, styles.cornerTopLeft, cornerHighlightStyle]} />
        <Animated.View style={[styles.cornerHighlight, styles.cornerTopRight, cornerHighlightStyle]} />
        <Animated.View style={[styles.cornerHighlight, styles.cornerBottomLeft, cornerHighlightStyle]} />
        <Animated.View style={[styles.cornerHighlight, styles.cornerBottomRight, cornerHighlightStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(7, 15, 11, 0.46)',
  },
  frame: {
    position: 'absolute',
    borderRadius: 30,
    borderWidth: 1.4,
    borderColor: 'rgba(151, 255, 198, 0.62)',
    overflow: 'hidden',
  },
  frameGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(143, 255, 196, 0.75)',
  },
  corner: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderColor: theme.colors.primaryLight,
  },
  cornerHighlight: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderColor: '#B6FFCF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 28,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 28,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 28,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 28,
  },
  scanLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    shadowColor: '#70F5A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 5,
  },
  scanGradient: {
    width: '100%',
    height: '100%',
  },
});
