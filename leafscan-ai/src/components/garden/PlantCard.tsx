import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Plant } from '../../types';
import { theme } from '../../theme/theme';

type PlantHealthState = 'healthy' | 'attention' | 'unscanned';

const STATE_LABEL_KEY: Record<PlantHealthState, string> = {
  healthy: 'garden.plantCard.healthy',
  attention: 'garden.plantCard.attention',
  unscanned: 'garden.plantCard.unscanned',
};

const STATE_COLORS: Record<PlantHealthState, { text: string; bg: string; border: string }> = {
  healthy: { text: theme.colors.healthy, bg: theme.colors.healthyBg, border: '#D1EAD4' },
  attention: { text: theme.colors.severe, bg: theme.colors.severeBg, border: '#F4CFD3' },
  unscanned: { text: theme.colors.textSecondary, bg: '#F2F0EC', border: '#E3DED7' },
};

function getPlantHealthState(plant: Plant): PlantHealthState {
  if (plant.totalScans <= 0) return 'unscanned';
  if (plant.status === 'healthy') return 'healthy';
  return 'attention';
}

interface PlantCardProps {
  plant: Plant;
  onPress: () => void;
}

export function PlantCard({ plant, onPress }: PlantCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const healthState = getPlantHealthState(plant);
  const stateStyle = STATE_COLORS[healthState];
  const scannedText = plant.totalScans > 0 ? plant.lastScanned : t('garden.plantCard.noScanData');

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.985, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.thumbWrap}>
          {plant.thumbnail ? (
            <Image source={{ uri: plant.thumbnail }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbFallback}>
              <Ionicons name="leaf-outline" size={20} color={theme.colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {plant.name}
          </Text>
          {plant.latinName ? (
            <Text style={styles.latinName} numberOfLines={1}>
              {plant.latinName}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Ionicons name="grid-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {plant.category || t('garden.plantCard.otherCategory')}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {plant.location || t('garden.plantCard.noLocation')}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: stateStyle.bg, borderColor: stateStyle.border }]}>
            <Text style={[styles.statusText, { color: stateStyle.text }]}>{t(STATE_LABEL_KEY[healthState])}</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.scanInfo} numberOfLines={1}>
              {scannedText}
            </Text>
            <Text style={styles.scanCount}>{t('garden.plantCard.scanCount', { count: plant.totalScans })}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8E0',
    backgroundColor: theme.colors.bgCard,
    ...theme.shadows.card,
  },
  cardPressed: {
    backgroundColor: '#F8FCF9',
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EAF5ED',
    marginRight: 12,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  latinName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  scanInfo: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  scanCount: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
