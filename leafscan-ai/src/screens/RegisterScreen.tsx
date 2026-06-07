import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import {
    getGoogleAuthDebugInfo,
    getGoogleAuthErrorMessage,
    resolveGoogleIdToken,
    signInWithNativeGoogle,
    useGoogleAuth,
} from '../api/google-auth';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Register'>;
};

type AccountRole = 'farmer' | 'dealer';

export default function RegisterScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [role, setRole] = useState<AccountRole>('farmer');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const register = useAuthStore(state => state.register);
    const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);
    const {
        request: googleRequest,
        promptAsync: googlePromptAsync,
        isConfigured: isGoogleAuthConfigured,
    } = useGoogleAuth();

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password) {
            Alert.alert(t('auth.missingInfo'), t('auth.registerMissingInfo'));
            return;
        }

        setLoading(true);
        try {
            await register({
                name: name.trim(),
                email: email.trim(),
                password,
                phone: phone.trim() || undefined,
                role: role === 'dealer' ? 'partner' : 'farmer',
            });
        } catch (error: any) {
            Alert.alert(t('auth.register_failed'), error?.message || t('common.tryAgain'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        if (!isGoogleAuthConfigured) {
            Alert.alert(
                t('auth.googleNotConfigured'),
                t('auth.googleMissingClient')
            );
            return;
        }

        if (Platform.OS === 'android') {
            setGoogleLoading(true);
            try {
                const idToken = await signInWithNativeGoogle();
                if (!idToken) return;
                await loginWithGoogle(idToken);
            } catch (error: any) {
                console.warn('[GoogleAuth] native register failed', error);
                Alert.alert(t('auth.googleRegisterFailed'), error?.message || t('common.tryAgain'));
            } finally {
                setGoogleLoading(false);
            }
            return;
        }

        if (!googleRequest) {
            Alert.alert(t('common.retry'), t('auth.googleNotReady'));
            return;
        }

        setGoogleLoading(true);
        try {
            const result = await googlePromptAsync();
            console.log('[GoogleAuth] register result', getGoogleAuthDebugInfo(result));
            if (result.type === 'cancel' || result.type === 'dismiss') return;

            const idToken = await resolveGoogleIdToken(result, googleRequest);
            if (!idToken) {
                Alert.alert(
                    t('auth.googleRegisterFailed'),
                    getGoogleAuthErrorMessage(result) || t('common.tryAgain')
                );
                return;
            }

            await loginWithGoogle(idToken);
        } catch (error: any) {
            console.warn('[GoogleAuth] register failed', error);
            Alert.alert(t('auth.googleRegisterFailed'), error?.message || t('common.tryAgain'));
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleAppleRegister = () => {
        Alert.alert(t('common.notSupported'), t('auth.appleRegisterUnsupported'));
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View
                style={[
                    styles.screenContent,
                    { paddingTop: Math.max(insets.top + 10, 22), paddingBottom: Math.max(insets.bottom + 10, 22) },
                ]}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="leaf-outline" size={28} color="#00460E" />
                        </View>
                        <Text style={styles.brand}>Leaf AI</Text>
                        <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.sectionLabel}>{t('auth.youAre')}</Text>
                        <View style={styles.roleRow}>
                            <RoleButton
                                label={t('auth.farmer')}
                                icon="leaf-outline"
                                active={role === 'farmer'}
                                onPress={() => setRole('farmer')}
                            />
                            <RoleButton
                                label={t('auth.dealer')}
                                icon="storefront-outline"
                                active={role === 'dealer'}
                                onPress={() => setRole('dealer')}
                            />
                        </View>

                        <View style={styles.form}>
                            <InputField
                                label={t('auth.fullName')}
                                icon="person-outline"
                                placeholder={t('auth.fullNamePlaceholder')}
                                value={name}
                                onChangeText={setName}
                            />
                            <InputField
                                label={t('auth.email')}
                                icon="mail-outline"
                                placeholder="example@leafai.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                            <InputField
                                label={t('auth.phone')}
                                icon="call-outline"
                                placeholder={t('auth.phonePlaceholder')}
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                            />
                            <InputField
                                label={t('auth.password')}
                                icon="lock-closed-outline"
                                placeholder="••••••••"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                rightIcon={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                onRightIconPress={() => setShowPassword(prev => !prev)}
                            />
                        </View>

                        <PrimaryButton label={t('auth.register')} loading={loading} onPress={handleRegister} />

                        <Divider label={t('auth.socialRegisterDivider')} />

                        <View style={styles.socialRow}>
                            <SocialButton
                                label="Google"
                                icon="logo-google"
                                iconColor="#4285F4"
                                loading={googleLoading}
                                onPress={handleGoogleRegister}
                            />
                            <SocialButton
                                label="Apple"
                                icon="logo-apple"
                                iconColor="#000000"
                                onPress={handleAppleRegister}
                            />
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
                        <TouchableOpacity activeOpacity={0.72} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.footerLink}>{t('auth.login')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

function RoleButton({
    label,
    icon,
    active,
    onPress,
}: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            activeOpacity={0.82}
            onPress={onPress}
            style={[styles.roleButton, active && styles.roleButtonActive]}
        >
            {active && (
                <View style={styles.roleCheck}>
                    <Ionicons name="checkmark" size={18} color={theme.colors.white} />
                </View>
            )}
            <Ionicons name={icon} size={23} color={active ? '#00460E' : '#374234'} />
            <Text style={[styles.roleText, active && styles.roleTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

type InputFieldProps = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    placeholder: string;
    value: string;
    onChangeText: (value: string) => void;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    secureTextEntry?: boolean;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
};

function InputField({
    label,
    icon,
    placeholder,
    value,
    onChangeText,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    secureTextEntry,
    rightIcon,
    onRightIconPress,
}: InputFieldProps) {
    return (
        <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputShell}>
                <Ionicons name={icon} size={21} color="#B9C2B3" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#7F877A"
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    secureTextEntry={secureTextEntry}
                />
                {rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.72} hitSlop={8}>
                        <Ionicons name={rightIcon} size={23} color="#B9C2B3" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

function PrimaryButton({
    label,
    loading,
    onPress,
}: {
    label: string;
    loading: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={onPress}
            disabled={loading}
            style={[styles.primaryButton, loading && styles.disabledButton]}
        >
            {loading ? (
                <ActivityIndicator color={theme.colors.white} />
            ) : (
                <>
                    <Text style={styles.primaryButtonText}>{label}</Text>
                    <Ionicons name="arrow-forward" size={24} color={theme.colors.white} />
                </>
            )}
        </TouchableOpacity>
    );
}

function Divider({ label }: { label: string }) {
    return (
        <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{label}</Text>
            <View style={styles.dividerLine} />
        </View>
    );
}

function SocialButton({
    label,
    icon,
    iconColor,
    loading,
    onPress,
}: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    loading?: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={loading} style={styles.socialButton}>
            {loading ? (
                <ActivityIndicator color="#004B0A" />
            ) : (
                <>
                    <Ionicons name={icon} size={23} color={iconColor} />
                    <Text style={styles.socialText}>{label}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8F3',
    },
    screenContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        overflow: 'hidden',
        borderRadius: 20,
        backgroundColor: '#FCFCFA',
        shadowColor: '#1B2A18',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.08,
        shadowRadius: 30,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#ECEFE8',
    },
    logoCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        shadowColor: '#1B2A18',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 5,
    },
    brand: {
        marginTop: 10,
        color: '#00460E',
        textAlign: 'center',
        fontSize: 26,
        lineHeight: 31,
        fontWeight: '800',
    },
    subtitle: {
        marginTop: 2,
        color: '#4C5449',
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '400',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 16,
    },
    sectionLabel: {
        color: '#10150F',
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '500',
    },
    roleRow: {
        marginTop: 6,
        flexDirection: 'row',
        gap: 10,
    },
    roleButton: {
        position: 'relative',
        flex: 1,
        height: 68,
        borderRadius: 12,
        borderWidth: 1.4,
        borderColor: '#BFC9BA',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: '#FCFCFA',
    },
    roleButtonActive: {
        borderWidth: 2.2,
        borderColor: '#00460E',
        backgroundColor: '#FFFFFF',
    },
    roleCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#005C12',
    },
    roleText: {
        color: '#374234',
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 17,
        fontWeight: '600',
    },
    roleTextActive: {
        color: '#00460E',
        fontWeight: '800',
    },
    form: {
        marginTop: 12,
        gap: 8,
    },
    inputBlock: {
        gap: 4,
    },
    inputLabel: {
        color: '#10150F',
        fontSize: 13,
        lineHeight: 17,
        fontWeight: '500',
    },
    inputShell: {
        height: 44,
        borderRadius: 10,
        borderWidth: 1.35,
        borderColor: '#B7C4B2',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 9,
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#20271F',
        fontSize: 14,
        lineHeight: 18,
        paddingVertical: 0,
    },
    primaryButton: {
        marginTop: 14,
        height: 50,
        borderRadius: 11,
        backgroundColor: '#004B0A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        shadowColor: '#004B0A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 7,
    },
    disabledButton: {
        opacity: 0.75,
    },
    primaryButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        lineHeight: 21,
        fontWeight: '800',
    },
    dividerRow: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E6DD',
    },
    dividerText: {
        color: '#747B70',
        fontSize: 13,
        lineHeight: 17,
        fontWeight: '600',
    },
    socialRow: {
        marginTop: 12,
        flexDirection: 'row',
        gap: 10,
    },
    socialButton: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        borderWidth: 1.2,
        borderColor: '#B7C4B2',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    socialText: {
        color: '#10120F',
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#F8F8F5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        flexWrap: 'wrap',
    },
    footerText: {
        color: '#4D554B',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '400',
    },
    footerLink: {
        color: '#00460E',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '800',
    },
});
