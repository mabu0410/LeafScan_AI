import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ScanState } from './types';

interface ScanFrameProps {
  state: ScanState;
  topInset: number;
  bottomInset: number;
}

const MIN_FRAME_WIDTH = 256;
const MAX_FRAME_WIDTH = 382;

type StateConfig = {
  label: string;
  guide: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

function stateConfig(state: ScanState, t: (key: string) => string): StateConfig {
  switch (state) {
    case 'plant_required':
      return {
        label: t('scan.frame.plant_required.label'),
        guide: t('scan.frame.plant_required.guide'),
        icon: 'leaf-outline',
        color: '#FFD88A',
      };
    case 'aligning':
      return {
        label: t('scan.frame.aligning.label'),
        guide: t('scan.frame.aligning.guide'),
        icon: 'scan-outline',
        color: '#D8FFEA',
      };
    case 'out_of_frame':
      return {
        label: t('scan.frame.out_of_frame.label'),
        guide: t('scan.frame.out_of_frame.guide'),
        icon: 'resize-outline',
        color: '#FFE8A8',
      };
    case 'optimal':
      return {
        label: t('scan.frame.optimal.label'),
        guide: t('scan.frame.optimal.guide'),
        icon: 'checkmark-circle-outline',
        color: '#B9FFD1',
      };
    case 'too_dark':
      return {
        label: t('scan.frame.too_dark.label'),
        guide: t('scan.frame.too_dark.guide'),
        icon: 'moon-outline',
        color: '#FFD3A5',
      };
    case 'no_leaf_detected':
      return {
        label: t('scan.frame.no_leaf_detected.label'),
        guide: t('scan.frame.no_leaf_detected.guide'),
        icon: 'alert-circle-outline',
        color: '#FFC6C6',
      };
    case 'processing':
      return {
        label: t('scan.frame.processing.label'),
        guide: t('scan.frame.processing.guide'),
        icon: 'sparkles-outline',
        color: '#C8FFE4',
      };
    case 'scan_success':
      return {
        label: t('scan.frame.scan_success.label'),
        guide: t('scan.frame.scan_success.guide'),
        icon: 'checkmark-done-circle-outline',
        color: '#B8FFC7',
      };
    case 'scan_failed':
    default:
      return {
        label: t('scan.frame.scan_failed.label'),
        guide: t('scan.frame.scan_failed.guide'),
        icon: 'close-circle-outline',
        color: '#FFC5C5',
      };
  }
}

function isPositiveState(state: ScanState) {
  return state === 'optimal' || state === 'scan_success';
}

export function ScanFrame({ state, topInset, bottomInset }: ScanFrameProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const compact = height < 700;

  const frameWidth = Math.min(
    Math.max(width * (compact ? 0.78 : 0.82), MIN_FRAME_WIDTH),
    MAX_FRAME_WIDTH
  );
  const frameHeight = frameWidth * 1.08;
  const suggestedTop = topInset + Math.max(compact ? 126 : 144, height * (compact ? 0.155 : 0.185));
  const maxTop = height - bottomInset - frameHeight - (compact ? 248 : 284);
  const frameTop = Math.max(topInset + (compact ? 118 : 136), Math.min(suggestedTop, maxTop));
  const frameLeft = (width - frameWidth) / 2;

  const lineProgress = useSharedValue(0);
  const glowPulse = useSharedValue(0.4);

  React.useEffect(() => {
    const duration = state === 'processing' ? 1100 : 2100;
    lineProgress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
  }, [lineProgress, state]);

  React.useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [glowPulse]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 8 + lineProgress.value * (frameHeight - 20) }],
    opacity: state === 'plant_required' ? 0.2 : state === 'processing' ? 0.9 : 0.7,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + glowPulse.value * 0.3,
  }));

  const config = stateConfig(state, t);
  const strongFrame = isPositiveState(state) || state === 'processing';
  const overlayTopHeight = frameTop;
  const overlayBottomTop = frameTop + frameHeight;
  const guideTop = compact ? frameTop + frameHeight - 48 : frameTop + frameHeight + 14;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: overlayTopHeight }]} />
      <View style={[styles.overlay, { top: frameTop, left: 0, width: frameLeft, height: frameHeight }]} />
      <View style={[styles.overlay, { top: frameTop, right: 0, width: frameLeft, height: frameHeight }]} />
      <View style={[styles.overlay, { top: overlayBottomTop, left: 0, right: 0, bottom: 0 }]} />

      <View style={[styles.frame, { top: frameTop, left: frameLeft, width: frameWidth, height: frameHeight }]}>
        <Animated.View
          style={[
            styles.frameGlow,
            glowStyle,
            {
              borderColor: strongFrame ? 'rgba(152, 255, 190, 0.9)' : 'rgba(222, 255, 238, 0.52)',
            },
          ]}
        />
        <Animated.View style={[styles.scanLine, scanLineStyle]}>
          <LinearGradient
            colors={[
              'rgba(102, 255, 177, 0)',
              'rgba(181, 255, 218, 0.95)',
              'rgba(102, 255, 177, 0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.scanGradient}
          />
        </Animated.View>

        <View style={[styles.corner, styles.cornerTopLeft, { borderColor: config.color }]} />
        <View style={[styles.corner, styles.cornerTopRight, { borderColor: config.color }]} />
        <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: config.color }]} />
        <View style={[styles.corner, styles.cornerBottomRight, { borderColor: config.color }]} />
      </View>

      <View style={[styles.statusBadge, { top: frameTop - 50 }]}>
        <Ionicons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>

      <View
        style={[
          styles.guideCard,
          {
            top: guideTop,
            backgroundColor: compact ? 'rgba(12, 27, 19, 0.92)' : 'rgba(10, 23, 16, 0.8)',
          },
        ]}
      >
        <Ionicons name="leaf-outline" size={16} color="rgba(228, 255, 237, 0.95)" />
        <Text style={styles.guideText}>{config.guide}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(5, 12, 9, 0.58)',
  },
  frame: {
    position: 'absolute',
    borderRadius: 30,
    borderWidth: 1.4,
    borderColor: 'rgba(214, 255, 232, 0.48)',
    overflow: 'hidden',
  },
  frameGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 2,
  },
  corner: {
    position: 'absolute',
    width: 56,
    height: 56,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 30,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 30,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 30,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 30,
  },
  scanLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#6EFFA8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 4,
  },
  scanGradient: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(9, 22, 16, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(196, 255, 220, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  guideCard: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(10, 23, 16, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(198, 255, 221, 0.25)',
    maxWidth: '90%',
  },
  guideText: {
    color: 'rgba(237, 255, 244, 0.96)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    flexShrink: 1,
  },
});
