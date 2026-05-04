import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';
import { ScanState } from './types';

interface ScanGuideTextProps {
  state: ScanState;
  bottomInset: number;
}

function buildGuideMessage(state: ScanState) {
  if (state === 'optimal') {
    return 'Đã căn chỉnh tốt, chụp để phân tích';
  }
  if (state === 'processing') {
    return 'AI đang phân tích ảnh lá cây';
  }
  if (state === 'aligning') {
    return 'Đưa lá cây vào trong khung để bắt đầu quét';
  }
  return 'Giữ máy ổn định để kết quả chính xác hơn';
}

export function ScanGuideText({ state, bottomInset }: ScanGuideTextProps) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (state === 'processing') {
      opacity.value = withTiming(0.95, { duration: 200 });
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.72, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [opacity, state]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, { bottom: bottomInset + 190 }, animatedStyle]} pointerEvents="none">
      <View style={styles.row}>
        <Ionicons name="leaf-outline" size={15} color="rgba(232, 255, 242, 0.92)" />
        <Text style={styles.text}>{buildGuideMessage(state)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 28, 20, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(192, 255, 218, 0.25)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(240, 255, 246, 0.95)',
    letterSpacing: 0.2,
  },
});
