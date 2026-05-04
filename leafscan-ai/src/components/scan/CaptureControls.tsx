import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface CaptureControlsProps {
  isScanning: boolean;
  bottomInset: number;
  onCapture: () => void;
  onPickFromGallery: () => void;
  onFlipCamera: () => void;
}

interface GlassIconButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
}

function GlassIconButton({ icon, onPress, disabled = false }: GlassIconButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.9, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        style={({ pressed }) => [styles.sideButton, pressed && styles.sideButtonPressed]}
      >
        <Ionicons name={icon} size={24} color="rgba(239, 255, 245, 0.94)" />
      </Pressable>
    </Animated.View>
  );
}

export function CaptureControls({
  isScanning,
  bottomInset,
  onCapture,
  onPickFromGallery,
  onFlipCamera,
}: CaptureControlsProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(1);

  React.useEffect(() => {
    if (isScanning) {
      glow.value = withTiming(0.7, { duration: 200 });
      return;
    }
    glow.value = withTiming(1, { duration: 220 });
  }, [glow, isScanning]);

  const captureStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={[styles.container, { bottom: bottomInset + 18 }]}>
      <GlassIconButton icon="images-outline" onPress={onPickFromGallery} disabled={isScanning} />

      <Animated.View style={[styles.captureGlow, glowStyle]}>
        <Animated.View style={captureStyle}>
          <Pressable
            onPress={onCapture}
            disabled={isScanning}
            onPressIn={() => {
              scale.value = withTiming(0.93, { duration: 120 });
            }}
            onPressOut={() => {
              scale.value = withTiming(1, { duration: 150 });
            }}
            style={styles.captureOuter}
          >
            <LinearGradient
              colors={['#4EB573', '#2C825A']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.captureInner}
            >
              {isScanning ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Ionicons name="scan-outline" size={34} color={theme.colors.white} />
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <GlassIconButton
        icon="camera-reverse-outline"
        onPress={onFlipCamera}
        disabled={isScanning}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  sideButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 31, 24, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sideButtonPressed: {
    backgroundColor: 'rgba(28, 45, 35, 0.62)',
  },
  captureGlow: {
    shadowColor: '#4ABF7A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 9,
  },
  captureOuter: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.84)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
