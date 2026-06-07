import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
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

const AUTH_BACKGROUND = require('../../assets/onboarding-field.png');

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const login = useAuthStore(state => state.login);
    const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);
    const {
        request: googleRequest,
        promptAsync: googlePromptAsync,
        isConfigured: isGoogleAuthConfigured,
    } = useGoogleAuth();

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert(t('auth.missingInfo'), t('auth.loginMissingInfo'));
            return;
        }

        setLoading(true);
        try {
            await login({ email: email.trim(), password });
        } catch (error: any) {
            Alert.alert(t('auth.login_failed'), error?.message || t('common.tryAgain'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
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
                console.warn('[GoogleAuth] native login failed', error);
                Alert.alert(t('auth.googleLoginFailed'), error?.message || t('common.tryAgain'));
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
            console.log('[GoogleAuth] login result', getGoogleAuthDebugInfo(result));
            if (result.type === 'cancel' || result.type === 'dismiss') return;

            const idToken = await resolveGoogleIdToken(result, googleRequest);
            if (!idToken) {
                Alert.alert(
                    t('auth.googleLoginFailed'),
                    getGoogleAuthErrorMessage(result) || t('common.tryAgain')
                );
                return;
            }

            await loginWithGoogle(idToken);
        } catch (error: any) {
            console.warn('[GoogleAuth] login failed', error);
            Alert.alert(t('auth.googleLoginFailed'), error?.message || t('common.tryAgain'));
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleAppleLogin = () => {
        Alert.alert(t('common.notSupported'), t('auth.appleLoginUnsupported'));
    };

    return (
        <ImageBackground
            source={AUTH_BACKGROUND}
            style={styles.background}
            imageStyle={styles.backgroundImage}
            blurRadius={Platform.OS === 'ios' ? 10 : 7}
        >
            <View style={styles.overlay} />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View
                    style={[
                        styles.screenContent,
                        { paddingTop: Math.max(insets.top + 14, 28), paddingBottom: Math.max(insets.bottom + 14, 28) },
                    ]}
                >
                    <View style={styles.card}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="leaf-outline" size={34} color="#9CD18D" />
                        </View>

                        <Text style={styles.brand}>Leaf AI</Text>
                        <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

                        <View style={styles.form}>
                            <InputField
                                label={t('auth.emailOrPhone')}
                                icon="person-outline"
                                placeholder={t('auth.emailOrPhonePlaceholder')}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />

                            <InputField
                                label={t('auth.password')}
                                icon="lock-closed-outline"
                                placeholder={t('auth.passwordPlaceholder')}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                rightIcon={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                onRightIconPress={() => setShowPassword(prev => !prev)}
                            />

                            <TouchableOpacity
                                activeOpacity={0.72}
                                onPress={() => navigation.navigate('ForgotPassword')}
                                style={styles.forgotButton}
                            >
                                <Text style={styles.forgotText}>{t('auth.forgotPasswordQuestion')}</Text>
                            </TouchableOpacity>

                            <PrimaryButton
                                label={t('auth.login')}
                                loading={loading}
                                onPress={handleLogin}
                            />
                        </View>

                        <Divider label={t('auth.socialLoginDivider')} />

                        <View style={styles.socialStack}>
                            <SocialButton
                                label="Google"
                                icon="logo-google"
                                iconColor="#4285F4"
                                loading={googleLoading}
                                onPress={handleGoogleLogin}
                            />
                            <SocialButton
                                label="Apple"
                                icon="logo-apple"
                                iconColor="#000000"
                                onPress={handleAppleLogin}
                            />
                        </View>

                        <View style={styles.footerRow}>
                            <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
                            <TouchableOpacity activeOpacity={0.72} onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.footerLink}>{t('auth.registerNow')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ImageBackground>
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
                <Ionicons name={icon} size={24} color="#B9C2B3" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#B9C2B3"
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    secureTextEntry={secureTextEntry}
                />
                {rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.72} hitSlop={8}>
                        <Ionicons name={rightIcon} size={26} color="#B9C2B3" />
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
                    <Ionicons name="arrow-forward" size={29} color={theme.colors.white} />
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
                    <Ionicons name={icon} size={27} color={iconColor} />
                    <Text style={styles.socialText}>{label}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#F7F7F3',
    },
    backgroundImage: {
        resizeMode: 'cover',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(247,248,243,0.58)',
    },
    keyboardView: {
        flex: 1,
    },
    screenContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    card: {
        width: '100%',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 20,
        backgroundColor: '#FCFCFA',
        borderWidth: 1,
        borderColor: 'rgba(185,194,179,0.36)',
        shadowColor: '#1B2A18',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.1,
        shadowRadius: 28,
        elevation: 12,
    },
    logoCircle: {
        alignSelf: 'center',
        width: 66,
        height: 66,
        borderRadius: 33,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#11591A',
        shadowColor: '#11591A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
    },
    brand: {
        marginTop: 14,
        textAlign: 'center',
        color: '#00460E',
        fontSize: 27,
        lineHeight: 32,
        fontWeight: '800',
    },
    subtitle: {
        marginTop: 6,
        textAlign: 'center',
        color: '#3E443B',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
    },
    form: {
        marginTop: 24,
        gap: 12,
    },
    inputBlock: {
        gap: 5,
    },
    inputLabel: {
        color: '#262C23',
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '500',
    },
    inputShell: {
        height: 48,
        borderRadius: 10,
        borderWidth: 1.4,
        borderColor: '#B7C4B2',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#20271F',
        fontSize: 15,
        lineHeight: 20,
        paddingVertical: 0,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: -4,
    },
    forgotText: {
        color: '#005C12',
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '800',
    },
    primaryButton: {
        marginTop: 8,
        height: 52,
        borderRadius: 10,
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
        fontSize: 18,
        lineHeight: 23,
        fontWeight: '800',
    },
    dividerRow: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E4E7DF',
    },
    dividerText: {
        color: '#747B70',
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '600',
    },
    socialStack: {
        marginTop: 12,
        gap: 10,
    },
    socialButton: {
        height: 46,
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
        fontSize: 16,
        lineHeight: 21,
        fontWeight: '500',
    },
    footerRow: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        flexWrap: 'wrap',
    },
    footerText: {
        color: '#4D554B',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
    },
    footerLink: {
        color: '#00460E',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '800',
    },
});
