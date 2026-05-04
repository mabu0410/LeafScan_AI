import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface ImageUploadBoxProps {
  imageUri: string | null;
  onTakePhoto: () => void;
  onPickLibrary: () => void;
  onRemoveImage: () => void;
}

function SmallAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.95, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={({ pressed }) => [styles.smallAction, pressed && styles.smallActionPressed]}
      >
        <Ionicons name={icon} size={14} color={theme.colors.primary} />
        <Text style={styles.smallActionText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ImageUploadBox({
  imageUri,
  onTakePhoto,
  onPickLibrary,
  onRemoveImage,
}: ImageUploadBoxProps) {
  if (imageUri) {
    return (
      <View style={styles.previewCard}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
        <View style={styles.previewActions}>
          <SmallAction icon="camera-outline" label="Đổi ảnh" onPress={onTakePhoto} />
          <SmallAction icon="images-outline" label="Thư viện" onPress={onPickLibrary} />
          <SmallAction icon="trash-outline" label="Xóa" onPress={onRemoveImage} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="image-outline" size={28} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>Thêm ảnh cây</Text>
      <Text style={styles.subtitle}>Chụp ảnh hoặc chọn từ thư viện</Text>

      <View style={styles.actionsRow}>
        <SmallAction icon="camera-outline" label="Chụp ảnh" onPress={onTakePhoto} />
        <SmallAction icon="images-outline" label="Thư viện" onPress={onPickLibrary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CFE2D4',
    backgroundColor: '#F6FBF7',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 22,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E4F1E7',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EDF6EF',
    borderWidth: 1,
    borderColor: '#D8EBDC',
  },
  smallActionPressed: {
    backgroundColor: '#E4F1E7',
  },
  smallActionText: {
    fontSize: 12.5,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  previewCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D7E7DA',
    backgroundColor: theme.colors.bgCard,
    padding: 12,
    marginBottom: 22,
    ...theme.shadows.card,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#EAF5ED',
    marginBottom: 10,
  },
  previewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
