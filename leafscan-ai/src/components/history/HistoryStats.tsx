import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface HistoryStatsProps {
  monthScans: number;
  detectedDiseases: number;
  healthyRate: number;
}

function StatCard({
  icon,
  label,
  value,
  tint = '#ECF6EE',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={14} color={theme.colors.primary} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function HistoryStats({ monthScans, detectedDiseases, healthyRate }: HistoryStatsProps) {
  return (
    <View style={styles.container}>
      <StatCard icon="calendar-outline" label="Tháng này" value={`${monthScans} lần`} />
      <StatCard
        icon="bug-outline"
        label="Phát hiện"
        value={`${detectedDiseases} bệnh`}
        tint="#FAEFE5"
      />
      <StatCard
        icon="leaf-outline"
        label="Tỉ lệ khỏe"
        value={`${healthyRate}%`}
        tint="#EBF6EE"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    minHeight: 88,
    borderRadius: 14,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#E6E1DA',
    paddingHorizontal: 11,
    paddingVertical: 9,
    ...theme.shadows.card,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  label: {
    fontSize: 11.5,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
