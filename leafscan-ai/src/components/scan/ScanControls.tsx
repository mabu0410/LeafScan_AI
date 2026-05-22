import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface ScanControlsProps {
  isScanning: boolean;
  captureDisabled?: boolean;
  bottomInset: number;
  onCapture: () => void;
  onPickFromGallery: () => void;
  onFlipCamera: () => void;
}

interface SecondaryButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function SecondaryButton({
  icon,
  label,
  onPress,
  disabled = false,
}: SecondaryButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.55 : 1,
  }));

  return (
    <Animated.View style={[styles.secondaryWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.94, { duration: 110 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
      >
        <Ionicons name={icon} size={22} color="rgba(238, 255, 246, 0.98)" />
      </Pressable>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Animated.View>
  );
}

export function ScanControls({
  isScanning,
  captureDisabled = false,
  bottomInset,
  onCapture,
  onPickFromGallery,
  onFlipCamera,
}: ScanControlsProps) {
  const scale = useSharedValue(1);
  const isCaptureBlocked = isScanning || captureDisabled;

  const captureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: captureDisabled && !isScanning ? 0.86 : 1,
  }));

  return (
    <View style={[styles.container, { bottom: bottomInset + 18 }]}>
      <SecondaryButton
        icon="images-outline"
        label="Thư viện"
        onPress={onPickFromGallery}
        disabled={isScanning}
      />

      <Animated.View style={[styles.captureButtonWrap, captureAnimatedStyle]}>
        <Pressable
          onPress={onCapture}
          disabled={isCaptureBlocked}
          onPressIn={() => {
            if (isCaptureBlocked) return;
            scale.value = withTiming(0.95, { duration: 110 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 160 });
          }}
          style={[styles.captureOuter, captureDisabled && !isScanning && styles.captureOuterDisabled]}
        >
          <LinearGradient
            colors={
              isScanning
                ? ['#4E9D72', '#2F6D4F']
                : captureDisabled
                  ? ['#7DAA8F', '#4A6B5A']
                  : ['#62D487', '#2E8E63']
            }
            start={{ x: 0.12, y: 0 }}
            end={{ x: 0.88, y: 1 }}
            style={styles.captureInner}
          >
            {isScanning ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="scan-outline" size={32} color="#FFFFFF" />
            )}
          </LinearGradient>
        </Pressable>
        <Text style={[styles.captureLabel, captureDisabled && !isScanning && styles.captureLabelMuted]}>
          {isScanning ? 'Đang quét...' : captureDisabled ? 'Chọn cây trước' : 'Quét ngay'}
        </Text>
      </Animated.View>

      <SecondaryButton
        icon="camera-reverse-outline"
        label="Đổi camera"
        onPress={onFlipCamera}
        disabled={isScanning}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  secondaryWrap: {
    alignItems: 'center',
    width: 86,
    gap: 7,
  },
  secondaryButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 31, 23, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(199, 255, 222, 0.26)',
  },
  secondaryPressed: {
    backgroundColor: 'rgba(26, 51, 38, 0.78)',
  },
  secondaryLabel: {
    color: 'rgba(223, 242, 233, 0.94)',
    fontSize: 11.5,
    fontWeight: '600',
  },
  captureButtonWrap: {
    alignItems: 'center',
    gap: 9,
  },
  captureOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(235, 255, 244, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(226, 255, 237, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5BCB83',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.36,
    shadowRadius: 16,
    elevation: 10,
  },
  captureInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureLabel: {
    color: 'rgba(237, 255, 244, 0.98)',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  captureOuterDisabled: {
    borderColor: 'rgba(213, 234, 222, 0.72)',
    shadowOpacity: 0.15,
  },
  captureLabelMuted: {
    color: 'rgba(215, 235, 224, 0.95)',
  },
});
