import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { AnimatedButton } from '../components/AnimatedButton';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Register'>;
};

const FARM_TYPES = ['Lúa', 'Cây ăn quả', 'Rau màu', 'Hoa', 'Cây công nghiệp', 'Khác'];
const SCALES = ['< 1 ha', '1-5 ha', '5-20 ha', '> 20 ha'];

export default function RegisterScreen({ navigation }: Props) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedFarms, setSelectedFarms] = useState<string[]>([]);
    const [selectedScale, setSelectedScale] = useState('');
    const [loading, setLoading] = useState(false);
    const register = useAuthStore(state => state.register);

    const toggleFarm = (farm: string) => {
        setSelectedFarms(prev =>
            prev.includes(farm) ? prev.filter(f => f !== farm) : [...prev, farm]
        );
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            await register({ name, email, password });
        } catch (error: any) {
            Alert.alert('Đăng ký thất bại', error?.message || 'Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Thông tin cá nhân</Text>
            <Text style={styles.stepSubtitle}>Cho chúng tôi biết đôi điều về bạn</Text>

            <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Họ và tên"
                    placeholderTextColor={theme.colors.textMuted}
                    value={name}
                    onChangeText={setName}
                />
            </View>

            <View style={styles.inputGroup}>
                <Ionicons name="call-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Số điện thoại"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                />
            </View>

            <AnimatedButton onPress={() => setStep(2)} size="lg" style={styles.button}>
                Tiếp theo
            </AnimatedButton>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Loại nông trại</Text>
            <Text style={styles.stepSubtitle}>Bạn đang trồng gì?</Text>

            <View style={styles.chipGrid}>
                {FARM_TYPES.map(farm => (
                    <TouchableOpacity
                        key={farm}
                        onPress={() => toggleFarm(farm)}
                        style={[styles.chip, selectedFarms.includes(farm) && styles.chipActive]}
                    >
                        <Text style={[styles.chipText, selectedFarms.includes(farm) && styles.chipTextActive]}>
                            {farm}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.stepSubtitle, { marginTop: 24 }]}>Quy mô</Text>
            <View style={styles.chipGrid}>
                {SCALES.map(scale => (
                    <TouchableOpacity
                        key={scale}
                        onPress={() => setSelectedScale(scale)}
                        style={[styles.chip, selectedScale === scale && styles.chipActive]}
                    >
                        <Text style={[styles.chipText, selectedScale === scale && styles.chipTextActive]}>
                            {scale}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <AnimatedButton onPress={() => setStep(3)} size="lg" style={styles.button}>
                Tiếp theo
            </AnimatedButton>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tạo tài khoản</Text>
            <Text style={styles.stepSubtitle}>Thiết lập đăng nhập cho bạn</Text>

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

            <View style={styles.inputGroup}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    placeholderTextColor={theme.colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
            </View>

            <AnimatedButton
                onPress={handleRegister}
                loading={loading}
                size="lg"
                style={styles.button}
            >
                Đăng ký
            </AnimatedButton>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Đăng ký</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Progress */}
                <View style={styles.progressRow}>
                    {[1, 2, 3].map(s => (
                        <View key={s} style={[styles.progressDot, s <= step && styles.progressDotActive]} />
                    ))}
                </View>

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}

                {/* Login Link */}
                <View style={styles.loginRow}>
                    <Text style={styles.loginText}>Đã có tài khoản? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginLink}>Đăng nhập</Text>
                    </TouchableOpacity>
                </View>
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
        marginBottom: 24,
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
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 32,
    },
    progressDot: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.bgMuted,
    },
    progressDotActive: {
        backgroundColor: theme.colors.primary,
    },
    stepContent: {
        gap: 16,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    stepSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 8,
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
    eyeButton: {
        padding: 4,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.bgMuted,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: theme.colors.primaryPale,
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    chipTextActive: {
        color: theme.colors.primary,
    },
    button: {
        width: '100%',
        marginTop: 16,
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    loginText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    loginLink: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
});
