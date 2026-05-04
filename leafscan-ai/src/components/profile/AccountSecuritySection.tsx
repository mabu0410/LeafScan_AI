import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface AccountSecuritySectionProps {
  isGoogleLinked: boolean;
  onChangePassword: () => void;
  onToggleGoogleLink: () => void;
  onDeleteAccount: () => void;
}

function Row({
  icon,
  label,
  value,
  onPress,
  danger = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.left}>
        <Ionicons name={icon} size={18} color={danger ? theme.colors.severe : theme.colors.textSecondary} />
        <Text style={[styles.label, danger && styles.danger]}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}

export function AccountSecuritySection({
  isGoogleLinked,
  onChangePassword,
  onToggleGoogleLink,
  onDeleteAccount,
}: AccountSecuritySectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tài khoản & Bảo mật</Text>
      <Row icon="key-outline" label="Đổi mật khẩu" onPress={onChangePassword} />
      <Row
        icon="logo-google"
        label="Liên kết Google"
        value={isGoogleLinked ? 'Đã liên kết' : 'Chưa liên kết'}
        onPress={onToggleGoogleLink}
      />
      <Row icon="alert-circle-outline" label="Xóa tài khoản" onPress={onDeleteAccount} danger />
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
  danger: {
    color: theme.colors.severe,
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
