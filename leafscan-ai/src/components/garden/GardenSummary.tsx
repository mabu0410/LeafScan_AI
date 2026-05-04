import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface GardenSummaryProps {
  totalPlants: number;
  healthyPlants: number;
  attentionPlants: number;
}

export function GardenSummary({
  totalPlants,
  healthyPlants,
  attentionPlants,
}: GardenSummaryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <View style={[styles.iconWrap, { backgroundColor: '#E9F6EC' }]}>
          <Ionicons name="leaf-outline" size={15} color={theme.colors.primary} />
        </View>
        <Text style={styles.value}>{totalPlants}</Text>
        <Text style={styles.label}>Tổng cây</Text>
      </View>

      <View style={styles.item}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.healthyBg }]}>
          <Ionicons name="checkmark-circle-outline" size={15} color={theme.colors.healthy} />
        </View>
        <Text style={styles.value}>{healthyPlants}</Text>
        <Text style={styles.label}>Khỏe mạnh</Text>
      </View>

      <View style={styles.item}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.severeBg }]}>
          <Ionicons name="warning-outline" size={15} color={theme.colors.severe} />
        </View>
        <Text style={[styles.value, { color: theme.colors.severe }]}>{attentionPlants}</Text>
        <Text style={styles.label}>Cần chú ý</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#E2E8E0',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...theme.shadows.card,
  },
  item: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontSize: 11.5,
    color: theme.colors.textSecondary,
  },
});
