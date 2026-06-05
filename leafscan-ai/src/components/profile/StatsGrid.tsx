import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface StatItem {
  id: string;
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint?: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profile.careStats')}</Text>
      <View style={styles.grid}>
        {stats.map((stat, index) => {
          const isLastOdd = stats.length % 2 === 1 && index === stats.length - 1;
          return (
            <View key={stat.id} style={[styles.card, isLastOdd && styles.cardFull]}>
              <View style={[styles.iconBox, { backgroundColor: stat.tint || '#E9F6EC' }]}>
                <Ionicons name={stat.icon} size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.value}>{stat.value}</Text>
              <Text style={styles.label}>{stat.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48.5%',
    borderRadius: 16,
    padding: 14,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#DEEADF',
    ...theme.shadows.card,
  },
  cardFull: {
    width: '100%',
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});
