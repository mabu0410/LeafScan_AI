import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface SettingsSectionProps {
  notifications: boolean;
  autoSaveScanImages: boolean;
  darkMode: boolean;
  language: 'vi' | 'en';
  scanQuality: 'normal' | 'high' | 'ultra';
  cameraPermissionLabel: string;
  onToggleNotifications: () => void;
  onOpenNotifications: () => void;
  onToggleAutoSave: () => void;
  onToggleDarkMode: () => void;
  onLanguagePress: () => void;
  onCameraPermissionPress: () => void;
  onScanQualityPress: () => void;
  onClearCachePress: () => void;
  onHistoryPress: () => void;
  onUpgradePlanPress: () => void;
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.left}>
        <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onToggle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E4E0DA', true: '#8FCB9C' }}
        thumbColor={theme.colors.white}
      />
    </View>
  );
}

export function SettingsSection({
  notifications,
  autoSaveScanImages,
  darkMode,
  language,
  scanQuality,
  cameraPermissionLabel,
  onToggleNotifications,
  onOpenNotifications,
  onToggleAutoSave,
  onToggleDarkMode,
  onLanguagePress,
  onCameraPermissionPress,
  onScanQualityPress,
  onClearCachePress,
  onHistoryPress,
  onUpgradePlanPress,
}: SettingsSectionProps) {
  const { t } = useTranslation();
  const languageLabel = language === 'vi' ? t('profile.settings.languageVi') : t('profile.settings.languageEn');
  const qualityLabel =
    scanQuality === 'ultra'
      ? t('profile.settings.qualityUltra')
      : scanQuality === 'high'
        ? t('profile.settings.qualityHigh')
        : t('profile.settings.qualityNormal');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profile.settings.title')}</Text>
      <SettingsRow icon="time-outline" label={t('profile.settings.scan_history')} onPress={onHistoryPress} />
      <SettingsRow icon="diamond-outline" label={t('profile.settings.ai_scan_plan')} onPress={onUpgradePlanPress} />
      <SettingsRow icon="notifications-outline" label={t('profile.settings.notifications')} value={notifications ? t('profile.settings.enabled') : t('profile.settings.disabled')} onPress={onOpenNotifications} />
      <ToggleRow
        icon="notifications-outline"
        label={t('profile.settings.push_notifications')}
        value={notifications}
        onToggle={onToggleNotifications}
      />
      <ToggleRow
        icon="moon-outline"
        label={t('profile.settings.dark_mode')}
        value={darkMode}
        onToggle={onToggleDarkMode}
      />
      <ToggleRow
        icon="save-outline"
        label={t('profile.settings.auto_save_scan')}
        value={autoSaveScanImages}
        onToggle={onToggleAutoSave}
      />
      <SettingsRow icon="language-outline" label={t('profile.settings.language')} value={languageLabel} onPress={onLanguagePress} />
      <SettingsRow
        icon="camera-outline"
        label={t('profile.settings.camera_permission')}
        value={cameraPermissionLabel}
        onPress={onCameraPermissionPress}
      />
      <SettingsRow
        icon="sparkles-outline"
        label={t('profile.settings.scan_quality')}
        value={qualityLabel}
        onPress={onScanQualityPress}
      />
      <SettingsRow icon="trash-outline" label={t('profile.settings.clear_cache')} onPress={onClearCachePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DEEADF',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 9,
  },
  rowPressed: {
    backgroundColor: '#F8FCF9',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  label: {
    fontSize: 14.5,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
