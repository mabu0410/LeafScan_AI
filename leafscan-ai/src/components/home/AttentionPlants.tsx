import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Plant } from '../../types';
import { theme } from '../../theme/theme';

interface AttentionPlantsProps {
  plants: Plant[];
  onPressPlant: (plantId: string) => void;
}

export function AttentionPlants({ plants, onPressPlant }: AttentionPlantsProps) {
  const { t } = useTranslation();
  const statusText: Record<Plant['status'], string> = {
    healthy: t('home.attentionPlants.healthy'),
    warning: t('home.attentionPlants.warning'),
    critical: t('home.attentionPlants.critical'),
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.attentionPlants.title')}</Text>
      </View>

      {plants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.healthy} />
          <Text style={styles.emptyText}>{t('home.attentionPlants.empty')}</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
          {plants.map((plant) => (
            <Pressable
              key={plant.id}
              onPress={() => onPressPlant(plant.id)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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

              <Text style={styles.name} numberOfLines={1}>
                {plant.name}
              </Text>
              <Text style={styles.status} numberOfLines={1}>
                {statusText[plant.status]}
              </Text>
              <Text style={styles.meta}>{t('home.attentionPlants.healthScore', { score: plant.healthScore })}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  list: {
    paddingRight: 8,
    gap: 10,
  },
  card: {
    width: 148,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E7DF',
    backgroundColor: theme.colors.bgCard,
    padding: 10,
    ...theme.shadows.card,
  },
  cardPressed: {
    backgroundColor: '#F8FCF9',
  },
  imageWrap: {
    width: '100%',
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EAF5ED',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    color: theme.colors.moderate,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E7DF',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
