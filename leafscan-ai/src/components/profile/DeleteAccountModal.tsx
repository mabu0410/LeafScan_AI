import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface DeleteAccountModalProps {
  visible: boolean;
  loading: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export function DeleteAccountModal({
  visible,
  loading,
  onConfirm,
  onCancel,
}: DeleteAccountModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleConfirm = () => {
    if (password.trim()) {
      onConfirm(password);
    }
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle" size={40} color={theme.colors.severe} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('profile.deleteModal.title')}</Text>
          <Text style={styles.subtitle}>{t('profile.deleteModal.description')}</Text>

          {/* Password input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder={t('profile.deleteModal.placeholder')}
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoFocus
              editable={!loading}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textMuted}
              />
            </Pressable>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleClose}
              style={[styles.button, styles.cancelButton]}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              style={[
                styles.button,
                styles.deleteButton,
                (!password.trim() || loading) && styles.buttonDisabled,
              ]}
              disabled={!password.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.deleteText}>{t('profile.deleteModal.deleteForever')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.bgCard,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.severeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  inputWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E3DFD8',
    borderRadius: 14,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14.5,
    color: theme.colors.textPrimary,
  },
  eyeButton: {
    padding: 6,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1,
    borderColor: '#E4DFD8',
  },
  deleteButton: {
    backgroundColor: theme.colors.severe,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
