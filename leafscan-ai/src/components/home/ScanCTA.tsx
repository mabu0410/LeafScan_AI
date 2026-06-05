import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface ScanCTAProps {
  onPress: () => void;
}

export function ScanCTA({ onPress }: ScanCTAProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
      >
        <LinearGradient
          colors={['#5FB577', '#3F9961']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          <View style={styles.iconBox}>
            <Ionicons name="camera" size={30} color={theme.colors.white} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>{t('home.scanCta.title')}</Text>
            <Text style={styles.subtitle}>{t('home.scanCta.subtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.white} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginBottom: 18,
    ...theme.shadows.scanButton,
  },
  container: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(250,255,251,0.86)',
    fontSize: 13.5,
    fontWeight: '500',
  },
});
