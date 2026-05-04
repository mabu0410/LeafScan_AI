import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { AnimatedButton } from '../components/AnimatedButton';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const otpRefs = useRef<(TextInput | null)[]>([]);

    const handleSendOtp = () => setStep(2);

    const handleReset = () => navigation.navigate('Login');

    const handleOtpChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < 3) {
            otpRefs.current[index + 1]?.focus();
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
                        onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
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
                        <Text style={styles.subtitle}>Chúng tôi sẽ gửi mã xác nhận đến email của bạn để đặt lại mật khẩu.</Text>

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

                        <AnimatedButton onPress={handleSendOtp} size="lg" style={styles.button}>
                            Gửi mã xác nhận
                        </AnimatedButton>
                    </View>
                ) : (
                    <View style={styles.stepContent}>
                        <Text style={styles.title}>Nhập mã xác nhận</Text>
                        <Text style={styles.subtitle}>Mã 4 số đã được gửi đến {email}</Text>

                        <View style={styles.otpRow}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={ref => { otpRefs.current[index] = ref; }}
                                    style={styles.otpInput}
                                    maxLength={1}
                                    keyboardType="number-pad"
                                    value={digit}
                                    onChangeText={(text) => handleOtpChange(text, index)}
                                />
                            ))}
                        </View>

                        <View style={[styles.inputGroup, { marginTop: 24 }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Mật khẩu mới"
                                placeholderTextColor={theme.colors.textMuted}
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                        </View>

                        <AnimatedButton onPress={handleReset} size="lg" style={styles.button}>
                            Đặt lại mật khẩu
                        </AnimatedButton>
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
        gap: 8,
    },
    otpInput: {
        width: 56,
        height: 56,
        textAlign: 'center',
        fontSize: 24,
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
});
