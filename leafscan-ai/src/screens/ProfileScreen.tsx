import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useHistoryStore } from '../stores/historyStore';
import { usePlantsStore } from '../stores/plantsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { deleteAccountApi } from '../api/account';
import { googleLinkApi, googleUnlinkApi, useGoogleAuth } from '../api/google-auth';
import { registerForPushNotificationsAsync, unregisterPushNotificationsAsync } from '../services/notifications';
import { theme } from '../theme/theme';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { AchievementCard } from '../components/profile/AchievementCard';
import { StatsGrid } from '../components/profile/StatsGrid';
import { MyPlantsSection } from '../components/profile/MyPlantsSection';
import { RecentScanSection } from '../components/profile/RecentScanSection';
import { SettingsSection } from '../components/profile/SettingsSection';
import { AccountSecuritySection } from '../components/profile/AccountSecuritySection';
import { AppInfoSection } from '../components/profile/AppInfoSection';
import { DeleteAccountModal } from '../components/profile/DeleteAccountModal';
import { isAdminAccount } from '../utils/admin';

const APP_VERSION = '1.0.0';
type Translate = (key: string, options?: Record<string, unknown>) => string;

function parseDateMillis(raw?: string): number {
    if (!raw) return 0;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return 0;
    return dt.getTime();
}

function buildLevel(totalScans: number, t: Translate) {
    const tiers = [
        { title: t('profile.levels.newbie'), target: 20, nextTitle: t('profile.levels.scanner1') },
        { title: t('profile.levels.scanner1'), target: 50, nextTitle: t('profile.levels.scanner2') },
        { title: t('profile.levels.scanner2'), target: 100, nextTitle: t('profile.levels.doctor') },
        { title: t('profile.levels.doctor'), target: 200, nextTitle: t('profile.levels.expert') },
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
    const { t } = useTranslation();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);
    const accessToken = useAuthStore(state => state.accessToken);
    const scans = useHistoryStore(state => state.scans);
    const loadHistory = useHistoryStore(state => state.loadHistory);
    const plants = usePlantsStore(state => state.plants);
    const loadPlants = usePlantsStore(state => state.loadPlants);
    const {
        notifications,
        autoSaveScanImages,
        darkMode,
        language,
        scanQuality,
        toggleAutoSaveScanImages,
        toggleDarkMode,
        updateSettings,
    } = useSettingsStore();
    const [isGoogleLinked, setIsGoogleLinked] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const {
        request: googleRequest,
        response: googleResponse,
        promptAsync: googlePromptAsync,
        isConfigured: isGoogleAuthConfigured,
    } = useGoogleAuth();
    const logoutScale = useSharedValue(1);
    const isAdmin = isAdminAccount(user);

    useEffect(() => {
        loadPlants().catch(() => undefined);
        loadHistory().catch(() => undefined);
    }, [loadHistory, loadPlants]);

    // Handle Google OAuth response
    useEffect(() => {
        if (googleResponse?.type === 'success' && googleResponse.authentication?.idToken) {
            const idToken = googleResponse.authentication.idToken;
            if (accessToken) {
                // Link mode
                googleLinkApi(accessToken, idToken)
                    .then(() => {
                        setIsGoogleLinked(true);
                        Alert.alert(t('common.success'), t('profile.alerts.googleLinked'));
                    })
                    .catch((err: any) => {
                        Alert.alert(t('common.error'), err.message || t('profile.alerts.googleLinkFailed'));
                    });
            }
        }
    }, [googleResponse, accessToken, t]);

    const sortedScans = useMemo(
        () =>
            [...scans].sort((a, b) => {
                const diff = parseDateMillis(b.scanDateISO) - parseDateMillis(a.scanDateISO);
                return diff === 0 ? b.id.localeCompare(a.id) : diff;
            }),
        [scans]
    );

    const level = useMemo(() => buildLevel(sortedScans.length, t), [sortedScans.length, t]);

    const badges = useMemo(
        () => [
            { id: 'sprout', label: t('profile.badges.sprout'), icon: 'leaf-outline' as const, earned: sortedScans.length >= 1 },
            { id: 'observer', label: t('profile.badges.observer'), icon: 'eye-outline' as const, earned: sortedScans.length >= 10 },
            { id: 'scanner', label: t('profile.badges.scanner'), icon: 'scan-outline' as const, earned: sortedScans.length >= 25 },
            { id: 'doctor', label: t('profile.badges.doctor'), icon: 'medkit-outline' as const, earned: sortedScans.length >= 50 },
            { id: 'ai-farmer', label: t('profile.badges.aiFarmer'), icon: 'sparkles-outline' as const, earned: sortedScans.length >= 100 },
        ],
        [sortedScans.length, t]
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
        if (sortedScans.length === 0) return t('common.noData');
        const bucket: Record<string, number> = {};
        sortedScans.forEach((scan) => {
            if (!scan.result) return;
            bucket[scan.result] = (bucket[scan.result] || 0) + 1;
        });
        const top = Object.entries(bucket).sort((a, b) => b[1] - a[1])[0];
        return top?.[0] || t('common.noData');
    }, [sortedScans, t]);

    const stats = useMemo(
        () => [
            { id: 'days', label: t('profile.stats.active_days'), value: String(activeDays), icon: 'calendar-outline' as const },
            { id: 'scans', label: t('profile.stats.scanned_plants'), value: String(sortedScans.length), icon: 'scan-outline' as const },
            {
                id: 'diseases',
                label: t('profile.stats.diseases_detected'),
                value: String(diseaseDetectedCount),
                icon: 'bug-outline' as const,
                tint: '#F9E9DE',
            },
            {
                id: 'healthy-rate',
                label: t('profile.stats.healthy_rate'),
                value: `${healthyPlantRate}%`,
                icon: 'heart-outline' as const,
            },
            {
                id: 'common-disease',
                label: t('profile.stats.common_disease'),
                value: commonDisease,
                icon: 'stats-chart-outline' as const,
                tint: '#EFEAF9',
            },
        ],
        [activeDays, commonDisease, diseaseDetectedCount, healthyPlantRate, sortedScans.length, t]
    );

    const cameraPermissionLabel = !cameraPermission
        ? t('profile.settings.checking')
        : cameraPermission.granted
            ? t('profile.settings.granted')
            : t('profile.settings.not_granted');

    const handleLogout = () => {
        Alert.alert(t('profile.alerts.logoutTitle'), t('profile.alerts.logoutConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('auth.logout'), style: 'destructive', onPress: logout },
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

    const handleToggleNotifications = async () => {
        if (!accessToken) {
            updateSettings('notifications', !notifications);
            return;
        }

        if (notifications) {
            updateSettings('notifications', false);
            await unregisterPushNotificationsAsync(accessToken).catch(() => undefined);
            return;
        }

        try {
            await registerForPushNotificationsAsync(accessToken);
            updateSettings('notifications', true);
            Alert.alert(t('profile.alerts.notificationsEnabledTitle'), t('profile.alerts.notificationsEnabledBody'));
        } catch (error: any) {
            updateSettings('notifications', false);
            Alert.alert(
                t('profile.alerts.notificationFailedTitle'),
                error?.message || t('profile.alerts.notificationFailedBody')
            );
        }
    };

    const handleCameraPermission = async () => {
        try {
            if (cameraPermission?.granted) {
                await Linking.openSettings();
                return;
            }
            await requestCameraPermission();
        } catch {
            Alert.alert(t('profile.alerts.openSettingsFailedTitle'), t('profile.alerts.openSettingsFailedBody'));
        }
    };

    const handleClearCache = async () => {
        try {
            // Xóa image cache thật
            const FileSystem = require('expo-file-system');
            const cacheDir = FileSystem.cacheDirectory;
            if (cacheDir) {
                const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
                if (cacheInfo.exists) {
                    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
                }
            }
        } catch {
            // Bỏ qua nếu không xóa được cache dir
        }

        // Reload data mới từ server
        await Promise.all([loadPlants(), loadHistory()]).catch(() => undefined);
        Alert.alert(t('profile.alerts.cacheClearedTitle'), t('profile.alerts.cacheClearedBody'));
    };

    const openPlaceholder = (featureName: string) => {
        Alert.alert(t('profile.alerts.comingSoonTitle'), t('profile.alerts.comingSoonBody', { featureName }));
    };

    const handleDeleteAccountConfirm = async (password: string) => {
        if (!accessToken) return;
        setDeleteLoading(true);
        try {
            await deleteAccountApi(accessToken, password);
            setDeleteModalVisible(false);
            Alert.alert(t('profile.deleteModal.title'), t('profile.alerts.accountDeleted'));
            logout();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('profile.alerts.deleteFailed'));
        } finally {
            setDeleteLoading(false);
        }
    };

    const openExternal = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
            Alert.alert(t('profile.alerts.openLinkFailedTitle'), t('profile.alerts.openLinkFailedBody'));
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
                    name={user?.name || t('profile.defaultName')}
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
                    onPressViewAll={() => navigation.navigate('History')}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(230).duration(420)}>
                <SettingsSection
                    notifications={notifications}
                    autoSaveScanImages={autoSaveScanImages}
                    darkMode={darkMode}
                    language={language}
                    scanQuality={scanQuality}
                    cameraPermissionLabel={cameraPermissionLabel}
                    onToggleNotifications={handleToggleNotifications}
                    onOpenNotifications={() => navigation.navigate('Notifications')}
                    onToggleAutoSave={toggleAutoSaveScanImages}
                    onToggleDarkMode={toggleDarkMode}
                    onLanguagePress={toggleLanguage}
                    onCameraPermissionPress={handleCameraPermission}
                    onScanQualityPress={cycleScanQuality}
                    onClearCachePress={handleClearCache}
                    onHistoryPress={() => navigation.navigate('History')}
                    onUpgradePlanPress={() => navigation.navigate('UpgradePlan')}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(270).duration(420)}>
                <AccountSecuritySection
                    isGoogleLinked={isGoogleLinked}
                    onChangePassword={() => navigation.navigate('ChangePassword')}
                    onToggleGoogleLink={async () => {
                        if (isGoogleLinked) {
                            // Unlink
                            try {
                                await googleUnlinkApi(accessToken || '');
                                setIsGoogleLinked(false);
                                Alert.alert(t('common.success'), t('profile.alerts.googleUnlinked'));
                            } catch (err: any) {
                                Alert.alert(t('common.error'), err.message || t('profile.alerts.googleUnlinkFailed'));
                            }
                        } else {
                            if (!isGoogleAuthConfigured) {
                                Alert.alert(
                                    t('auth.googleNotConfigured'),
                                    t('profile.alerts.googleMissingClient')
                                );
                                return;
                            }
                            if (!googleRequest) {
                                Alert.alert(t('common.retry'), t('auth.googleNotReady'));
                                return;
                            }
                            // Link — trigger Google sign-in
                            googlePromptAsync();
                        }
                    }}
                    onDeleteAccount={() => setDeleteModalVisible(true)}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(310).duration(420)}>
                <Pressable style={styles.partnerButton} onPress={() => navigation.navigate('PartnerChannel')}>
                    <Text style={styles.partnerButtonTitle}>{t('profile.partner.title')}</Text>
                    <Text style={styles.partnerButtonText}>{t('profile.partner.description')}</Text>
                </Pressable>
                {isAdmin && (
                    <Pressable style={styles.adminButton} onPress={() => navigation.navigate('AdminModeration')}>
                        <Text style={styles.adminButtonTitle}>{t('profile.admin.title')}</Text>
                        <Text style={styles.adminButtonText}>{t('profile.admin.description')}</Text>
                    </Pressable>
                )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(330).duration(420)}>
                <AppInfoSection
                    appVersion={APP_VERSION}
                    onHelpFeedback={() => openExternal('mailto:leafscan.ai.support@gmail.com?subject=Leaf_AI%20-%20Trợ%20giúp%20%26%20Phản%20hồi')}
                    onPrivacyPolicy={() => navigation.navigate('PrivacyPolicy' as any)}
                    onTermsOfUse={() => navigation.navigate('TermsOfUse' as any)}
                />
            </Animated.View>

            <Animated.View style={styles.logoutWrap} entering={FadeInDown.delay(360).duration(420)}>
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
                        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
                    </Pressable>
                </Animated.View>
            </Animated.View>

            <DeleteAccountModal
                visible={deleteModalVisible}
                loading={deleteLoading}
                onConfirm={handleDeleteAccountConfirm}
                onCancel={() => setDeleteModalVisible(false)}
            />
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
    partnerButton: {
        marginHorizontal: 20,
        marginTop: 18,
        padding: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.bgCard,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    partnerButtonTitle: {
        color: theme.colors.textPrimary,
        fontSize: 16,
        fontWeight: '900',
    },
    partnerButtonText: {
        marginTop: 5,
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
    },
    adminButton: {
        marginHorizontal: 20,
        marginTop: 10,
        padding: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.primaryPale,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    adminButtonTitle: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '900',
    },
    adminButtonText: {
        marginTop: 5,
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
    },
});
