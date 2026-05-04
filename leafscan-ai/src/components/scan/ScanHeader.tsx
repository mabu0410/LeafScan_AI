import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface ScanHeaderProps {
  topInset: number;
  torchEnabled: boolean;
  onClose: () => void;
  onToggleFlash: () => void;
  disabled?: boolean;
}

interface HeaderIconButtonProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
}

function HeaderIconButton({ iconName, onPress, disabled = false }: HeaderIconButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.92, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 140 });
        }}
        style={({ pressed }) => [
          styles.iconButton,
          disabled && styles.iconButtonDisabled,
          pressed && styles.iconButtonPressed,
        ]}
      >
        <Ionicons name={iconName} size={20} color={theme.colors.white} />
      </Pressable>
    </Animated.View>
  );
}

export function ScanHeader({
  topInset,
  torchEnabled,
  onClose,
  onToggleFlash,
  disabled = false,
}: ScanHeaderProps) {
  return (
    <View style={[styles.container, { top: topInset + 12 }]}>
      <HeaderIconButton iconName="close" onPress={onClose} disabled={false} />
      <HeaderIconButton
        iconName={torchEnabled ? 'flash' : 'flash-outline'}
        onPress={onToggleFlash}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 31, 24, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(29, 45, 35, 0.6)',
  },
  iconButtonDisabled: {
    opacity: 0.65,
  },
});
