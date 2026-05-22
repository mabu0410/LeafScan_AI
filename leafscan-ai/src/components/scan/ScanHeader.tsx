import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CompactPlantSelector } from './CompactPlantSelector';

interface ScanHeaderProps {
  topInset: number;
  torchEnabled: boolean;
  onClose: () => void;
  onToggleFlash: () => void;
  selectedPlantLabel: string;
  hasSelection: boolean;
  onPressPlantSelector: () => void;
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
        <Ionicons name={iconName} size={20} color="rgba(244, 255, 248, 0.98)" />
      </Pressable>
    </Animated.View>
  );
}

export function ScanHeader({
  topInset,
  torchEnabled,
  onClose,
  onToggleFlash,
  selectedPlantLabel,
  hasSelection,
  onPressPlantSelector,
  disabled = false,
}: ScanHeaderProps) {
  return (
    <View style={[styles.container, { top: topInset + 8 }]}>
      <HeaderIconButton iconName="close" onPress={onClose} disabled={false} />
      <View style={styles.titleCard}>
        <Text style={styles.title}>Quét bệnh lá cây</Text>
        <CompactPlantSelector
          selectedLabel={selectedPlantLabel}
          hasSelection={hasSelection}
          disabled={disabled}
          onPress={onPressPlantSelector}
        />
      </View>
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
    alignItems: 'flex-start',
    zIndex: 20,
  },
  titleCard: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: 16,
    minHeight: 84,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(12, 26, 19, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 219, 0.2)',
    gap: 8,
  },
  title: {
    textAlign: 'center',
    color: 'rgba(241, 255, 247, 0.98)',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 24, 18, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(197, 255, 220, 0.24)',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(21, 44, 31, 0.72)',
  },
  iconButtonDisabled: {
    opacity: 0.65,
  },
});
