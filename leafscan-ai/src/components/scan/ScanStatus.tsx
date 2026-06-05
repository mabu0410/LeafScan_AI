import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ScanState } from './types';

interface ScanStatusProps {
  state: ScanState;
  bottomInset: number;
}

function getStatusConfig(state: ScanState, t: (key: string) => string) {
  if (state === 'processing') {
    return {
      label: t('scan.status.processing'),
      icon: 'hourglass-outline' as const,
      color: '#C4FFD9',
    };
  }
  if (state === 'optimal') {
    return {
      label: t('scan.status.optimal'),
      icon: 'checkmark-circle-outline' as const,
      color: '#B8FFCE',
    };
  }
  if (state === 'aligning') {
    return {
      label: t('scan.status.aligning'),
      icon: 'scan-outline' as const,
      color: '#D9FDE6',
    };
  }
  return {
    label: t('scan.status.ready'),
    icon: 'sparkles-outline' as const,
    color: '#E7FFF0',
  };
}

export function ScanStatus({ state, bottomInset }: ScanStatusProps) {
  const { t } = useTranslation();
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(0.5, { duration: 100 }, finished => {
      if (finished) {
        opacity.value = withTiming(1, { duration: 220 });
      }
    });
    translateY.value = withTiming(-2, { duration: 120 }, finished => {
      if (finished) {
        translateY.value = withTiming(0, { duration: 180 });
      }
    });
  }, [opacity, state, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const { label, icon, color } = getStatusConfig(state, t);

  return (
    <Animated.View style={[styles.container, { bottom: bottomInset + 132 }, animatedStyle]} pointerEvents="none">
      <View style={styles.inner}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.text, { color }]}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(180, 255, 209, 0.28)',
    backgroundColor: 'rgba(11, 22, 16, 0.58)',
  },
  text: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
});
