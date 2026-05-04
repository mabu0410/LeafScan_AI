import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface ProfileAvatarPickerProps {
  avatarUri: string | null;
  onPressChange: () => void;
}

export function ProfileAvatarPicker({ avatarUri, onPressChange }: ProfileAvatarPickerProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={46} color={theme.colors.primary} />
          </View>
        )}
      </View>

      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPressChange}
          onPressIn={() => {
            scale.value = withTiming(0.96, { duration: 120 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 150 });
          }}
          style={({ pressed }) => [styles.changeButton, pressed && styles.changeButtonPressed]}
        >
          <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.changeText}>Đổi ảnh</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D9EEDC',
    backgroundColor: '#EAF5ED',
    marginBottom: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF7F0',
    borderWidth: 1,
    borderColor: '#D4E9D8',
  },
  changeButtonPressed: {
    backgroundColor: '#E4F2E8',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
