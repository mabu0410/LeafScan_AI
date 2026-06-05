import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Plant } from '../../types';
import { theme } from '../../theme/theme';

interface MyPlantsSectionProps {
  plants: Plant[];
  onPressPlant: (plantId: string) => void;
  onPressManage: () => void;
}

const STATUS_STYLE: Record<Plant['status'], { color: string; bg: string; labelKey: string }> = {
  healthy: { labelKey: 'profile.myPlantsSection.healthy', color: theme.colors.healthy, bg: theme.colors.healthyBg },
  warning: { labelKey: 'profile.myPlantsSection.warning', color: theme.colors.moderate, bg: theme.colors.moderateBg },
  critical: { labelKey: 'profile.myPlantsSection.critical', color: theme.colors.severe, bg: theme.colors.severeBg },
};

function PlantRow({ plant, onPress }: { plant: Plant; onPress: () => void }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const status = STATUS_STYLE[plant.status];

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
            {t('profile.myPlantsSection.latestScan', { value: plant.lastScanned })}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{t(status.labelKey)}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.scanCount}>{plant.totalScans}</Text>
          <Text style={styles.scanLabel}>{t('profile.myPlantsSection.scanLabel')}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function MyPlantsSection({ plants, onPressPlant, onPressManage }: MyPlantsSectionProps) {
  const { t } = useTranslation();
  const previewPlants = plants.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.myPlantsSection.title')}</Text>
        <Pressable onPress={onPressManage}>
          <Text style={styles.manageText}>{t('profile.myPlantsSection.manage')}</Text>
        </Pressable>
      </View>

      {previewPlants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="leaf-outline" size={20} color={theme.colors.primaryLight} />
          <Text style={styles.emptyText}>{t('profile.myPlantsSection.empty')}</Text>
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
