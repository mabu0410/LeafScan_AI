import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme/theme';

interface SeverityBadgeProps {
  severity: 'healthy' | 'moderate' | 'severe';
  size?: 'sm' | 'md' | 'lg';
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const { t } = useTranslation();
  const config = {
    healthy: {
      bg: theme.colors.healthyBg,
      text: theme.colors.healthy,
      icon: 'checkmark-circle' as const,
      label: t('history.severity.healthyTitle'),
    },
    moderate: {
      bg: theme.colors.moderateBg,
      text: theme.colors.moderate,
      icon: 'warning' as const,
      label: t('history.severity.moderateTitle'),
    },
    severe: {
      bg: theme.colors.severeBg,
      text: theme.colors.severe,
      icon: 'close-circle' as const,
      label: t('history.severity.severeTitle'),
    },
  };

  const current = config[severity] || config.healthy;

  const sizeConfig = {
    sm: { paddingH: 8, paddingV: 2, fontSize: 10, iconSize: 10, gap: 4 },
    md: { paddingH: 10, paddingV: 4, fontSize: 12, iconSize: 12, gap: 6 },
    lg: { paddingH: 12, paddingV: 6, fontSize: 14, iconSize: 14, gap: 8 },
  };

  const sz = sizeConfig[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: current.bg,
          paddingHorizontal: sz.paddingH,
          paddingVertical: sz.paddingV,
          gap: sz.gap,
        },
      ]}
    >
      <Ionicons name={current.icon} size={sz.iconSize} color={current.text} />
      <Text style={[styles.label, { color: current.text, fontSize: sz.fontSize }]}>
        {current.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
  },
  label: {
    fontWeight: '600',
  },
});
