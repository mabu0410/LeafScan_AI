import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface SaveButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SaveButton({
  onPress,
  loading = false,
  disabled = false,
}: SaveButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => {
          if (!isDisabled) {
            scale.value = withTiming(0.97, { duration: 120 });
          }
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={[styles.button, isDisabled ? styles.buttonDisabled : styles.buttonEnabled]}
      >
        {loading ? <ActivityIndicator color={theme.colors.white} style={styles.loader} /> : null}
        <Text style={styles.text}>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonEnabled: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.scanButton,
  },
  buttonDisabled: {
    backgroundColor: '#B8D0B8',
  },
  loader: {
    marginRight: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
