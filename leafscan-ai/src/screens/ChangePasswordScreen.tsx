import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { theme } from '../theme/theme';
import { changePasswordApi } from '../api/account';
import { useAuthStore } from '../stores/authStore';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ChangePassword'>;
};

export default function ChangePasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const accessToken = useAuthStore(state => state.accessToken);

  const isValid =
    currentPassword.length >= 6 &&
    newPassword.length >= 8 &&
    confirmPassword === newPassword;

  const handleSubmit = async () => {
    if (!isValid || !accessToken) return;
    setLoading(true);
    try {
      await changePasswordApi(accessToken, currentPassword, newPassword);
      Alert.alert(t('auth.changePassword.successTitle'), t('auth.changePassword.successBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.changePassword.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('auth.change_password')}</Text>
          <View style={styles.headerRightSpace} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.helperText}>
            {t('auth.changePassword.helper')}
          </Text>

          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t('auth.current_password')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('auth.new_password')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.confirm_password')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            disabled={!isValid || loading}
            onPress={handleSubmit}
            style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <Text style={styles.submitText}>{t('auth.changePassword.submit')}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#E4DFD8',
    ...theme.shadows.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerRightSpace: {
    width: 42,
    height: 42,
  },
  formCard: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7E2DB',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...theme.shadows.card,
  },
  helperText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: '#E3DFD8',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#B8D0B8',
  },
  submitText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
