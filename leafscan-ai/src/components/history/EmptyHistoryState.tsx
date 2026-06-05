import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface EmptyHistoryStateProps {
  onPressScan: () => void;
}

export function EmptyHistoryState({ onPressScan }: EmptyHistoryStateProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <View style={styles.innerCircle}>
          <Ionicons name="leaf-outline" size={36} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>{t('history.empty.title')}</Text>
      <Text style={styles.description}>{t('history.empty.description')}</Text>

      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPressScan}
          onPressIn={() => {
            scale.value = withTiming(0.96, { duration: 120 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 160 });
          }}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Ionicons name="scan-outline" size={16} color={theme.colors.white} />
          <Text style={styles.buttonText}>{t('history.empty.button')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 26,
  },
  illustration: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#ECF6EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  innerCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#DFF0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.scanButton,
  },
  buttonPressed: {
    backgroundColor: '#4C774B',
  },
  buttonText: {
    fontSize: 14,
    color: theme.colors.white,
    fontWeight: '700',
  },
});
