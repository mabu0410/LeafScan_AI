import React from 'react';
import {
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

const ONBOARDING_BACKGROUND = require('../../assets/onboarding-field.png');

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const completeOnboarding = useAuthStore(state => state.completeOnboarding);

    const goToRegister = () => {
        completeOnboarding();
        navigation.replace('Register');
    };

    const goToLogin = () => {
        completeOnboarding();
        navigation.replace('Login');
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={ONBOARDING_BACKGROUND}
                style={styles.background}
                imageStyle={styles.backgroundImage}
            >
                <LinearGradient
                    pointerEvents="none"
                    colors={[
                        'rgba(255,255,255,0)',
                        'rgba(255,255,255,0.18)',
                        'rgba(255,255,255,0.92)',
                    ]}
                    locations={[0, 0.48, 1]}
                    style={styles.fieldFade}
                />
            </ImageBackground>

            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}>
                <View style={styles.dragHandle} />

                <Text style={styles.title}>
                    Chào mừng bạn đến với{'\n'}
                    Leaf AI
                </Text>

                <Text style={styles.subtitle}>Giải pháp AI bảo vệ mùa màng của bạn</Text>

                <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={goToRegister}
                    style={styles.primaryButton}
                >
                    <Text style={styles.primaryButtonText}>Bắt đầu ngay</Text>
                    <Ionicons name="arrow-forward" size={30} color={theme.colors.white} />
                </TouchableOpacity>

                <View style={styles.loginRow}>
                    <Text style={styles.loginText}>Đã có tài khoản?</Text>
                    <TouchableOpacity activeOpacity={0.72} onPress={goToLogin} hitSlop={8}>
                        <Text style={styles.loginLink}>Đăng nhập</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    backgroundImage: {
        resizeMode: 'cover',
    },
    fieldFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 260,
        height: 340,
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 320,
        paddingTop: 58,
        paddingHorizontal: 28,
        alignItems: 'center',
        backgroundColor: '#FAFAF8',
        borderTopLeftRadius: 42,
        borderTopRightRadius: 42,
        shadowColor: '#263326',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.08,
        shadowRadius: 22,
        elevation: 18,
    },
    dragHandle: {
        position: 'absolute',
        top: 28,
        width: 48,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#D9D9D6',
    },
    title: {
        width: '100%',
        maxWidth: 320,
        textAlign: 'center',
        fontSize: 30,
        lineHeight: 38,
        fontWeight: '800',
        color: '#00460E',
    },
    subtitle: {
        marginTop: 26,
        width: '100%',
        textAlign: 'center',
        fontSize: 18,
        lineHeight: 25,
        fontWeight: '400',
        color: '#3B4038',
    },
    primaryButton: {
        marginTop: 36,
        width: '100%',
        height: 64,
        borderRadius: 15,
        backgroundColor: '#004B0A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        shadowColor: '#004B0A',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 8,
    },
    primaryButtonText: {
        color: theme.colors.white,
        fontSize: 19,
        lineHeight: 24,
        fontWeight: '800',
    },
    loginRow: {
        marginTop: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loginText: {
        color: '#50574D',
        fontSize: 16,
        lineHeight: 22,
        fontWeight: '400',
    },
    loginLink: {
        color: '#00460E',
        fontSize: 16,
        lineHeight: 22,
        fontWeight: '800',
    },
});
