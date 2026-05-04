import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface StatsCardsProps {
  avgHealth: number | null;
  scannedPlantsCount: number;
  warningCount: number;
}

function useCountUp(target: number) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    let rafId = 0;
    const start = Date.now();
    const duration = 700;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const nextValue = Math.round(target * progress);
      setValue(nextValue);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    tick();
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [target]);

  return value;
}

function StatValue({
  value,
  suffix = '',
  hasValue = true,
}: {
  value: number;
  suffix?: string;
  hasValue?: boolean;
}) {
  const animatedValue = useCountUp(value);

  if (!hasValue) {
    return <Text style={styles.statValueMuted}>--</Text>;
  }

  return (
    <Text style={styles.statValue}>
      {animatedValue}
      {suffix}
    </Text>
  );
}

export function StatsCards({
  avgHealth,
  scannedPlantsCount,
  warningCount,
}: StatsCardsProps) {
  const hasAnyData = avgHealth !== null || scannedPlantsCount > 0;
  const hasHealth = avgHealth !== null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: '#EAF5ED' }]}>
            <Ionicons name="pulse-outline" size={20} color={theme.colors.healthy} />
          </View>
          <StatValue value={avgHealth ?? 0} suffix="%" hasValue={hasHealth} />
          <Text style={styles.statLabel}>Sức khỏe trung bình</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: '#EAF5ED' }]}>
            <Ionicons name="leaf-outline" size={20} color={theme.colors.primary} />
          </View>
          <StatValue value={scannedPlantsCount} />
          <Text style={styles.statLabel}>Cây đã quét</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: '#FBEAEA' }]}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.severe} />
          </View>
          <Text style={[styles.statValue, warningCount > 0 && styles.warningValue]}>
            {warningCount}
          </Text>
          <Text style={styles.statLabel}>Cảnh báo</Text>
        </View>
      </View>

      {!hasAnyData ? (
        <View style={styles.emptyNote}>
          <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>Chưa có dữ liệu, hãy quét lá để bắt đầu theo dõi.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#E1E8DF',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  statValueMuted: {
    fontSize: 21,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 3,
  },
  warningValue: {
    color: theme.colors.severe,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  emptyNote: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F6F5F3',
    borderWidth: 1,
    borderColor: '#E7E2DC',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
});
