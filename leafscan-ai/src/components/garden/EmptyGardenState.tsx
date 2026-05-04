import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface EmptyGardenStateProps {
  onAddFirstPlant: () => void;
}

export function EmptyGardenState({ onAddFirstPlant }: EmptyGardenStateProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.duration(450)} style={styles.container}>
      <View style={styles.illustrationWrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="flower-outline" size={44} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={styles.title}>Bạn chưa có cây nào</Text>
      <Text style={styles.description}>
        Thêm cây đầu tiên để theo dõi sức khỏe, lịch sử quét và cảnh báo bệnh.
      </Text>

      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onAddFirstPlant}
          onPressIn={() => {
            scale.value = withTiming(0.96, { duration: 120 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 160 });
          }}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Ionicons name="add" size={18} color={theme.colors.white} />
          <Text style={styles.buttonText}>Thêm cây đầu tiên</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 8,
  },
  illustrationWrap: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#EEF7F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E0F0E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.scanButton,
  },
  buttonPressed: {
    backgroundColor: '#4C774B',
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
