import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useHistoryStore } from '../stores/historyStore';
import { usePlantsStore } from '../stores/plantsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { theme } from '../theme/theme';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { AchievementCard } from '../components/profile/AchievementCard';
import { StatsGrid } from '../components/profile/StatsGrid';
import { MyPlantsSection } from '../components/profile/MyPlantsSection';
import { RecentScanSection } from '../components/profile/RecentScanSection';
import { SettingsSection } from '../components/profile/SettingsSection';
import { AccountSecuritySection } from '../components/profile/AccountSecuritySection';
import { AppInfoSection } from '../components/profile/AppInfoSection';

const APP_VERSION = '1.0.0';

function parseDateMillis(raw?: string): number {
    if (!raw) return 0;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return 0;
    return dt.getTime();
}

function buildLevel(totalScans: number) {
    const tiers = [
        { title: 'Người mới', target: 20, nextTitle: 'Thợ quét cấp 1' },
        { title: 'Thợ quét cấp 1', target: 50, nextTitle: 'Thợ quét cấp 2' },
        { title: 'Thợ quét cấp 2', target: 100, nextTitle: 'Bác sĩ cây' },
        { title: 'Bác sĩ cây', target: 200, nextTitle: 'Chuyên gia nông nghiệp AI' },
    ];

    const tier = tiers.find((item) => totalScans < item.target) || tiers[tiers.length - 1];
    return {
        title: tier.title,
        current: totalScans,
        target: tier.target,
        nextTitle: tier.nextTitle,
    };
}

export default function ProfileScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const insets = useSafeAreaInsets();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);
    const scans = useHistoryStore(state => state.scans);
    const loadHistory = useHistoryStore(state => state.loadHistory);
    const plants = usePlantsStore(state => state.plants);
    const loadPlants = usePlantsStore(state => state.loadPlants);
    const {
        notifications,
        autoSaveScanImages,
        language,
        scanQuality,
        toggleNotifications,
        toggleAutoSaveScanImages,
        updateSettings,
    } = useSettingsStore();
    const [isGoogleLinked, setIsGoogleLinked] = useState(false);
    const logoutScale = useSharedValue(1);

    useEffect(() => {
        loadPlants().catch(() => undefined);
        loadHistory().catch(() => undefined);
    }, [loadHistory, loadPlants]);

    const sortedScans = useMemo(
        () =>
            [...scans].sort((a, b) => {
                const diff = parseDateMillis(b.scanDateISO) - parseDateMillis(a.scanDateISO);
                return diff === 0 ? b.id.localeCompare(a.id) : diff;
            }),
        [scans]
    );

    const level = useMemo(() => buildLevel(sortedScans.length), [sortedScans.length]);

    const badges = useMemo(
        () => [
            { id: 'sprout', label: 'Mầm xanh', icon: 'leaf-outline' as const, earned: sortedScans.length >= 1 },
            { id: 'observer', label: 'Quan sát viên', icon: 'eye-outline' as const, earned: sortedScans.length >= 10 },
            { id: 'scanner', label: 'Thợ quét', icon: 'scan-outline' as const, earned: sortedScans.length >= 25 },
            { id: 'doctor', label: 'Bác sĩ cây', icon: 'medkit-outline' as const, earned: sortedScans.length >= 50 },
            { id: 'ai-farmer', label: 'Nông dân AI', icon: 'sparkles-outline' as const, earned: sortedScans.length >= 100 },
        ],
        [sortedScans.length]
    );

    const activeDays = useMemo(() => {
        const daySet = new Set<string>();
        sortedScans.forEach((scan) => {
            if (scan.scanDateISO) {
                daySet.add(scan.scanDateISO.slice(0, 10));
                return;
            }
            daySet.add(scan.date);
        });
        return daySet.size;
    }, [sortedScans]);

    const diseaseDetectedCount = useMemo(
        () => sortedScans.filter((s) => s.severity !== 'healthy').length,
        [sortedScans]
    );

    const healthyPlantRate = useMemo(() => {
        if (plants.length === 0) return 0;
        const healthyCount = plants.filter((p) => p.status === 'healthy').length;
        return Math.round((healthyCount / plants.length) * 100);
    }, [plants]);

    const commonDisease = useMemo(() => {
        if (sortedScans.length === 0) return 'Chưa có dữ liệu';
        const bucket: Record<string, number> = {};
        sortedScans.forEach((scan) => {
            if (!scan.result) return;
            bucket[scan.result] = (bucket[scan.result] || 0) + 1;
        });
        const top = Object.entries(bucket).sort((a, b) => b[1] - a[1])[0];
        return top?.[0] || 'Chưa có dữ liệu';
    }, [sortedScans]);

    const stats = useMemo(
        () => [
            { id: 'days', label: 'Ngày hoạt động', value: String(activeDays), icon: 'calendar-outline' as const },
            { id: 'scans', label: 'Cây đã quét', value: String(sortedScans.length), icon: 'scan-outline' as const },
            {
                id: 'diseases',
                label: 'Bệnh phát hiện',
                value: String(diseaseDetectedCount),
                icon: 'bug-outline' as const,
                tint: '#F9E9DE',
            },
            {
                id: 'healthy-rate',
                label: 'Tỷ lệ cây khỏe',
                value: `${healthyPlantRate}%`,
                icon: 'heart-outline' as const,
            },
            {
                id: 'common-disease',
                label: 'Bệnh thường gặp nhất',
                value: commonDisease,
                icon: 'stats-chart-outline' as const,
                tint: '#EFEAF9',
            },
        ],
        [activeDays, commonDisease, diseaseDetectedCount, healthyPlantRate, sortedScans.length]
    );

    const cameraPermissionLabel = !cameraPermission
        ? 'Đang kiểm tra'
        : cameraPermission.granted
            ? 'Đã cấp'
            : 'Chưa cấp';

    const handleLogout = () => {
        Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng xuất', style: 'destructive', onPress: logout },
        ]);
    };

    const logoutAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoutScale.value }],
    }));

    const toggleLanguage = () => {
        updateSettings('language', language === 'vi' ? 'en' : 'vi');
    };

    const cycleScanQuality = () => {
        const next = scanQuality === 'normal' ? 'high' : scanQuality === 'high' ? 'ultra' : 'normal';
        updateSettings('scanQuality', next);
    };

    const handleCameraPermission = async () => {
        try {
            if (cameraPermission?.granted) {
                await Linking.openSettings();
                return;
            }
            await requestCameraPermission();
        } catch {
            Alert.alert('Không thể mở cài đặt', 'Vui lòng cấp quyền camera trong cài đặt thiết bị.');
        }
    };

    const handleClearCache = async () => {
        await Promise.all([loadPlants(), loadHistory()]);
        Alert.alert('Đã dọn bộ nhớ cache', 'Dữ liệu tạm đã được làm mới.');
    };

    const openPlaceholder = (featureName: string) => {
        Alert.alert('Đang cập nhật', `${featureName} sẽ sớm có trong phiên bản tới.`);
    };

    const openExternal = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
            Alert.alert('Không thể mở liên kết', 'Thiết bị chưa hỗ trợ mở liên kết này.');
            return;
        }
        await Linking.openURL(url);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View entering={FadeInDown.duration(420)}>
                <ProfileHeader
                    name={user?.name || 'Nông dân LeafScan'}
                    email={user?.email || 'email@example.com'}
                    onEditPress={() => navigation.navigate('EditProfile')}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(420)}>
                <AchievementCard level={level} badges={badges} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(110).duration(420)}>
                <StatsGrid stats={stats} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).duration(420)}>
                <MyPlantsSection
                    plants={plants}
                    onPressPlant={(plantId) => navigation.navigate('PlantDetail', { plantId })}
                    onPressManage={() => navigation.navigate('MainTabs', { screen: 'Garden' } as any)}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(190).duration(420)}>
                <RecentScanSection
                    scans={sortedScans}
                    onPressScan={(scan) => navigation.navigate('DiseaseDetail', { diseaseId: scan.diseaseKey || scan.id })}
                    onPressViewAll={() => navigation.navigate('MainTabs', { screen: 'History' } as any)}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(230).duration(420)}>
                <SettingsSection
                    notifications={notifications}
                    autoSaveScanImages={autoSaveScanImages}
                    language={language}
                    scanQuality={scanQuality}
                    cameraPermissionLabel={cameraPermissionLabel}
                    onToggleNotifications={toggleNotifications}
                    onToggleAutoSave={toggleAutoSaveScanImages}
                    onLanguagePress={toggleLanguage}
                    onCameraPermissionPress={handleCameraPermission}
                    onScanQualityPress={cycleScanQuality}
                    onClearCachePress={handleClearCache}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(270).duration(420)}>
                <AccountSecuritySection
                    isGoogleLinked={isGoogleLinked}
                    onChangePassword={() => navigation.navigate('ChangePassword')}
                    onToggleGoogleLink={() => setIsGoogleLinked((prev) => !prev)}
                    onDeleteAccount={() =>
                        Alert.alert('Xóa tài khoản', 'Thao tác này sẽ xóa toàn bộ dữ liệu của bạn.', [
                            { text: 'Hủy', style: 'cancel' },
                            { text: 'Xác nhận xóa', style: 'destructive', onPress: () => openPlaceholder('Xóa tài khoản') },
                        ])
                    }
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(310).duration(420)}>
                <AppInfoSection
                    appVersion={APP_VERSION}
                    onHelpFeedback={() => openPlaceholder('Trợ giúp & Phản hồi')}
                    onPrivacyPolicy={() => openExternal('https://leafscan.ai/privacy')}
                    onTermsOfUse={() => openExternal('https://leafscan.ai/terms')}
                />
            </Animated.View>

            <Animated.View style={styles.logoutWrap} entering={FadeInDown.delay(340).duration(420)}>
                <Animated.View style={logoutAnimatedStyle}>
                    <Pressable
                        onPress={handleLogout}
                        onPressIn={() => {
                            logoutScale.value = withTiming(0.97, { duration: 100 });
                        }}
                        onPressOut={() => {
                            logoutScale.value = withTiming(1, { duration: 150 });
                        }}
                        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
                    >
                        <Text style={styles.logoutText}>Đăng xuất</Text>
                    </Pressable>
                </Animated.View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
    },
    logoutWrap: {
        marginHorizontal: 20,
        marginTop: 26,
    },
    logoutButton: {
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.severeBg,
        borderWidth: 1,
        borderColor: '#F1CDD3',
    },
    logoutButtonPressed: {
        backgroundColor: '#F8E7EB',
    },
    logoutText: {
        color: theme.colors.severe,
        fontWeight: '700',
        fontSize: 15.5,
    },
});
