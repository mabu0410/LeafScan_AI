import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Plant } from '../../types';
import { theme } from '../../theme/theme';

interface MyPlantsSectionProps {
  plants: Plant[];
  onPressPlant: (plantId: string) => void;
  onPressManage: () => void;
}

const STATUS_MAP: Record<Plant['status'], { label: string; color: string; bg: string }> = {
  healthy: { label: 'Ổn định', color: theme.colors.healthy, bg: theme.colors.healthyBg },
  warning: { label: 'Cần chú ý', color: theme.colors.moderate, bg: theme.colors.moderateBg },
  critical: { label: 'Nguy cơ cao', color: theme.colors.severe, bg: theme.colors.severeBg },
};

function PlantRow({ plant, onPress }: { plant: Plant; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const status = STATUS_MAP[plant.status];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      >
        <View style={styles.imageWrap}>
          {plant.image ? (
            <Image source={{ uri: plant.image }} style={styles.image} />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="leaf-outline" size={18} color={theme.colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {plant.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            Lần quét gần nhất: {plant.lastScanned}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.scanCount}>{plant.totalScans}</Text>
          <Text style={styles.scanLabel}>lần quét</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function MyPlantsSection({ plants, onPressPlant, onPressManage }: MyPlantsSectionProps) {
  const previewPlants = plants.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cây của tôi</Text>
        <Pressable onPress={onPressManage}>
          <Text style={styles.manageText}>Quản lý vườn</Text>
        </Pressable>
      </View>

      {previewPlants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="leaf-outline" size={20} color={theme.colors.primaryLight} />
          <Text style={styles.emptyText}>Bạn chưa thêm cây nào để theo dõi.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {previewPlants.map((plant) => (
            <PlantRow key={plant.id} plant={plant} onPress={() => onPressPlant(plant.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  manageText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  list: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DEEADF',
    backgroundColor: theme.colors.bgCard,
    ...theme.shadows.card,
  },
  itemPressed: {
    backgroundColor: '#F8FCF9',
  },
  imageWrap: {
    width: 52,
    height: 52,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#EAF5ED',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  right: {
    alignItems: 'center',
    paddingLeft: 10,
  },
  scanCount: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  scanLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DEEADF',
    backgroundColor: theme.colors.bgCard,
    padding: 14,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
});
