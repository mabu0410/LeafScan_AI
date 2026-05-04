import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring, FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { theme } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
    {
        id: 1,
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=390&q=85',
        icon: '📷',
        title: 'Quét lá, phát hiện bệnh',
        subtitle: 'Chỉ cần chụp ảnh lá cây, AI sẽ chẩn đoán bệnh trong 3 giây',
    },
    {
        id: 2,
        image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=390&q=85',
        icon: '🧠',
        title: 'AI chẩn đoán chính xác 95%',
        subtitle: 'Nhận dạng hơn 50 loại bệnh phổ biến trên 30+ loài cây trồng tại Việt Nam',
    },
    {
        id: 3,
        image: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=390&q=85',
        icon: '💊',
        title: 'Điều trị & Phòng ngừa',
        subtitle: 'Nhận hướng dẫn điều trị cụ thể và lịch nhắc chăm sóc cây tự động',
    },
];

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: Props) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const slide = ONBOARDING_SLIDES[currentSlide];

    const handleNext = () => {
        if (currentSlide === ONBOARDING_SLIDES.length - 1) {
            navigation.replace('Login');
        } else {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const handleSkip = () => {
        navigation.replace('Login');
    };

    return (
        <View style={styles.container}>
            {/* Background Image */}
            <Image source={{ uri: slide.image }} style={styles.bgImage} />

            {/* Gradient Overlay */}
            <View style={styles.gradient} />

            {/* Skip Button */}
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Bỏ qua</Text>
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.icon}>{slide.icon}</Text>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>

                {/* Controls */}
                <View style={styles.controls}>
                    {/* Dots */}
                    <View style={styles.dots}>
                        {ONBOARDING_SLIDES.map((_, index) => (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        width: index === currentSlide ? 24 : 6,
                                        backgroundColor: index === currentSlide ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Button */}
                    <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.85}>
                        <Text style={styles.nextText}>
                            {currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Bắt đầu' : 'Tiếp theo'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgDark,
    },
    bgImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(28,25,23,0.6)',
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 20,
    },
    skipText: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
        fontSize: 14,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 60,
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.white,
        marginBottom: 12,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 24,
        maxWidth: 300,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 40,
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    nextButton: {
        backgroundColor: theme.colors.white,
        height: 54,
        paddingHorizontal: 32,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.float,
    },
    nextText: {
        color: theme.colors.bgDark,
        fontWeight: '600',
        fontSize: 16,
    },
});
