import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface ReadOnlyInfoCardProps {
  accountId: string;
  joinedAt: string;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function ReadOnlyInfoCard({ accountId, joinedAt }: ReadOnlyInfoCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('profile.edit.accountInfo')}</Text>
      <InfoRow icon="id-card-outline" label={t('profile.edit.accountId')} value={accountId} />
      <InfoRow icon="calendar-outline" label={t('profile.edit.joinedAt')} value={joinedAt} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E0D9',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...theme.shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  label: {
    fontSize: 13.5,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
