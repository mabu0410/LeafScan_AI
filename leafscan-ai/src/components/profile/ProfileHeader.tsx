import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface ProfileHeaderProps {
  name: string;
  email: string;
  onEditPress: () => void;
}

export function ProfileHeader({ name, email, onEditPress }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient
      colors={['#F5FDF7', '#EEF8F1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.avatarWrap}>
        <View style={styles.avatarGlow} />
        <View style={styles.avatar}>
          <Ionicons name="person" size={42} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.email} numberOfLines={1}>
        {email}
      </Text>

      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={onEditPress}
          onPressIn={() => {
            scale.value = withTiming(0.96, { duration: 120 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 160 });
          }}
          style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
        >
          <Ionicons name="create-outline" size={16} color={theme.colors.white} />
          <Text style={styles.editText}>{t('profile.editProfile')}</Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEEE0',
    ...theme.shadows.card,
  },
  avatarWrap: {
    marginBottom: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(141, 184, 138, 0.24)',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D8EED8',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  editButtonPressed: {
    backgroundColor: '#4E7A4D',
  },
  editText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
});
