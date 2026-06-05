import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Splash'>;
};

export default function SplashScreen({ navigation }: Props) {
    const { t } = useTranslation();
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);
    const iconY = useSharedValue(0);
    const textY = useSharedValue(20);
    const textOpacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
        opacity.value = withTiming(1, { duration: 800 });
        iconY.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1
        );
        textY.value = withTiming(0, { duration: 500 });
        textOpacity.value = withTiming(1, { duration: 500 });

        const timer = setTimeout(() => {
            navigation.replace('Onboarding');
        }, 2500);

        return () => clearTimeout(timer);
    }, [navigation]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: iconY.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: textY.value }],
        opacity: textOpacity.value,
    }));

    return (
        <View style={styles.container}>
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <Animated.View style={[styles.centerGroup, containerStyle]}>
                <Animated.View style={[styles.iconBox, iconStyle]}>
                    <Ionicons name="leaf" size={48} color={theme.colors.white} />
                </Animated.View>

                <Animated.View style={titleStyle}>
                    <Text style={styles.title}>LeafScan AI</Text>
                </Animated.View>

                <Animated.View style={titleStyle}>
                    <Text style={styles.subtitle}>{t('splash.subtitle')}</Text>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    bgCircle1: {
        position: 'absolute',
        top: '25%',
        left: '25%',
        width: 256,
        height: 256,
        borderRadius: 128,
        backgroundColor: theme.colors.primaryPale,
        opacity: 0.5,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: '25%',
        right: '25%',
        width: 256,
        height: 256,
        borderRadius: 128,
        backgroundColor: theme.colors.accentLight,
        opacity: 0.3,
    },
    centerGroup: {
        alignItems: 'center',
    },
    iconBox: {
        width: 96,
        height: 96,
        borderRadius: 32,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        ...theme.shadows.float,
    },
    title: {
        fontSize: 36,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        marginTop: 12,
        letterSpacing: 0.5,
    },
});
