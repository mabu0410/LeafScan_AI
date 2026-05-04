import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface AppInfoSectionProps {
  appVersion: string;
  onHelpFeedback: () => void;
  onPrivacyPolicy: () => void;
  onTermsOfUse: () => void;
}

function Row({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, onPress && pressed && styles.rowPressed]}
    >
      <View style={styles.left}>
        <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {showChevron ? <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} /> : null}
      </View>
    </Pressable>
  );
}

export function AppInfoSection({
  appVersion,
  onHelpFeedback,
  onPrivacyPolicy,
  onTermsOfUse,
}: AppInfoSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thông tin ứng dụng</Text>
      <Row icon="help-circle-outline" label="Trợ giúp & Phản hồi" onPress={onHelpFeedback} />
      <Row icon="shield-checkmark-outline" label="Chính sách bảo mật" onPress={onPrivacyPolicy} />
      <Row icon="document-text-outline" label="Điều khoản sử dụng" onPress={onTermsOfUse} />
      <Row icon="information-circle-outline" label="Phiên bản app" value={appVersion} showChevron={false} />
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
