import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface HomeHeaderProps {
  userName: string;
  avatarUri?: string | null;
  onPressNotifications: () => void;
  onPressProfile: () => void;
}

interface SoftIconButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  isAvatar?: boolean;
  avatarUri?: string | null;
}

function SoftIconButton({
  icon,
  onPress,
  isAvatar = false,
  avatarUri = null,
}: SoftIconButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.94, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        style={({ pressed }) => [
          styles.iconButton,
          isAvatar && styles.avatarButton,
          pressed && styles.iconButtonPressed,
        ]}
      >
        {isAvatar && avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <Ionicons
            name={icon}
            size={20}
            color={isAvatar ? theme.colors.primary : theme.colors.textPrimary}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

export function HomeHeader({
  userName,
  avatarUri = null,
  onPressNotifications,
  onPressProfile,
}: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textWrap}>
        <Text style={styles.greeting}>Xin chào, {userName} 👋</Text>
        <Text style={styles.subtitle}>Hôm nay cây của bạn thế nào?</Text>
      </View>
      <View style={styles.actions}>
        <SoftIconButton icon="notifications-outline" onPress={onPressNotifications} />
        <SoftIconButton
          icon="person"
          onPress={onPressProfile}
          isAvatar
          avatarUri={avatarUri}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 16,
  },
  textWrap: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: 25,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13.5,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: '#E4E0DA',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  avatarButton: {
    backgroundColor: '#E9F6EC',
    borderColor: '#D4EBD9',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  iconButtonPressed: {
    backgroundColor: '#F7F6F3',
  },
});
