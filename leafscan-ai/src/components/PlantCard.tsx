import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plant } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { HealthRing } from './HealthRing';
import { theme } from '../theme/theme';

interface PlantCardProps {
  plant: Plant;
  onPress?: () => void;
  variant?: 'grid' | 'list';
}

export function PlantCard({ plant, onPress, variant = 'grid' }: PlantCardProps) {
  const severityMap: Record<string, 'healthy' | 'moderate' | 'severe'> = {
    healthy: 'healthy',
    warning: 'moderate',
    critical: 'severe',
  };

  if (variant === 'list') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.listContainer}>
        <Image source={{ uri: plant.thumbnail }} style={styles.listImage} />
        <View style={styles.listContent}>
          <Text style={styles.name} numberOfLines={1}>{plant.name}</Text>
          <Text style={styles.category} numberOfLines={1}>{plant.category}</Text>
          <View style={styles.statusRow}>
            <SeverityBadge severity={severityMap[plant.status]} size="sm" />
            <Text style={styles.lastScanned}>{plant.lastScanned}</Text>
          </View>
        </View>
        <HealthRing score={plant.healthScore} size={48} strokeWidth={4} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.gridContainer}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: plant.thumbnail }} style={styles.gridImage} />
        <View style={styles.badgePosition}>
          <SeverityBadge severity={severityMap[plant.status]} size="sm" />
        </View>
      </View>
      <View style={styles.gridContent}>
        <Text style={styles.name} numberOfLines={1}>{plant.name}</Text>
        <Text style={styles.category} numberOfLines={1}>{plant.category}</Text>
        <View style={styles.gridFooter}>
          <HealthRing score={plant.healthScore} size={32} strokeWidth={3} />
          <Text style={styles.lastScanned}>{plant.lastScanned}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  imageWrapper: {
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  badgePosition: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gridContent: {
    padding: 12,
  },
  name: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginBottom: 2,
  },
  category: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 8,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastScanned: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  listContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgCard,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  listImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  listContent: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
});
