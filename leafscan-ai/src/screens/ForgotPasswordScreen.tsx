import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { AnimatedButton } from '../components/AnimatedButton';
import { theme } from '../theme/theme';
import { forgotPasswordApi, resetPasswordApi } from '../api/account';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

const OTP_LENGTH = 6;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email.');
      return;
    }
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      Alert.alert('Đã gửi', 'Nếu email tồn tại, mã OTP đã được gửi. Kiểm tra hộp thư (hoặc log backend).');
      setStep(2);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const otpString = otp.join('');
    if (otpString.length < OTP_LENGTH) {
      Alert.alert('Lỗi', `Vui lòng nhập đủ ${OTP_LENGTH} chữ số OTP.`);
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordApi(email.trim(), otpString, newPassword);
      Alert.alert('Thành công', 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quên mật khẩu</Text>
          <View style={{ width: 40 }} />
        </View>

        {step === 1 ? (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Nhập email của bạn</Text>
            <Text style={styles.subtitle}>
              Chúng tôi sẽ gửi mã xác nhận đến email của bạn để đặt lại mật khẩu.
            </Text>

            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <AnimatedButton onPress={handleSendOtp} size="lg" style={styles.button} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.colors.white} size="small" /> : 'Gửi mã xác nhận'}
            </AnimatedButton>
          </View>
        ) : (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Nhập mã xác nhận</Text>
            <Text style={styles.subtitle}>Mã {OTP_LENGTH} số đã được gửi đến {email}</Text>

            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    otpRefs.current[index] = ref;
                  }}
                  style={styles.otpInput}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                />
              ))}
            </View>

            <View style={[styles.inputGroup, { marginTop: 24 }]}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <AnimatedButton onPress={handleReset} size="lg" style={styles.button} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.colors.white} size="small" /> : 'Đặt lại mật khẩu'}
            </AnimatedButton>

            <TouchableOpacity onPress={handleSendOtp} style={styles.resendLink}>
              <Text style={styles.resendText}>Gửi lại mã OTP</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  stepContent: {
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  otpInput: {
    flex: 1,
    height: 56,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    color: theme.colors.textPrimary,
  },
  button: {
    width: '100%',
    marginTop: 16,
  },
  resendLink: {
    alignSelf: 'center',
    marginTop: 12,
  },
  resendText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
