import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface SubmitButtonProps {
  title: string;
  loadingTitle?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}

export function SubmitButton({
  title,
  loadingTitle = 'Đang thêm...',
  disabled = false,
  loading = false,
  onPress,
}: SubmitButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => {
          if (!isDisabled) {
            scale.value = withTiming(0.97, { duration: 110 });
          }
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        style={[styles.button, isDisabled ? styles.buttonDisabled : styles.buttonEnabled]}
      >
        {loading ? <ActivityIndicator size="small" color={theme.colors.white} style={styles.loader} /> : null}
        <Text style={styles.buttonText}>{loading ? loadingTitle : title}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  buttonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
