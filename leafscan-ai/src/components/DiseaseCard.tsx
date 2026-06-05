import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DiseaseLibraryItem } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { theme } from '../theme/theme';

interface DiseaseCardProps {
  disease: DiseaseLibraryItem;
  onPress?: () => void;
}

export function DiseaseCard({ disease, onPress }: DiseaseCardProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.container}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: disease.image }} style={styles.image} />
        <View style={styles.badgeOverlay}>
          <SeverityBadge severity={disease.severity} size="sm" />
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{disease.name}</Text>
        <Text style={styles.plant} numberOfLines={1}>{disease.plant}</Text>
        <View style={styles.footer}>
          <Text style={styles.cases}>{t('diseaseCard.casesThisMonth', { count: disease.casesThisMonth })}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    minWidth: 240,
    maxWidth: 280,
    ...theme.shadows.card,
  },
  imageContainer: {
    height: 128,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  content: {
    padding: 16,
  },
  name: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontSize: 13,
    marginBottom: 4,
  },
  plant: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cases: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
