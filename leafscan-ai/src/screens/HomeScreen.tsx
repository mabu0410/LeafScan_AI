import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RootStackParamList, Plant, ScanHistory } from '../types';
import { theme } from '../theme/theme';
import { HomeHeader } from '../components/home/HomeHeader';
import { StatsCards } from '../components/home/StatsCards';
import { ScanCTA } from '../components/home/ScanCTA';
import { TodayTipCard } from '../components/home/TodayTipCard';
import { TipDetailSheet } from '../components/home/TipDetailSheet';
import { AttentionPlants } from '../components/home/AttentionPlants';
import { RecentScans } from '../components/home/RecentScans';
import { HomeSummary } from '../types/home';
import { MOCK_HOME_SUMMARY } from '../data/mockHome';
import { fetchHomeSummaryApi } from '../api/home';
import { useAuthStore } from '../stores/authStore';

const USE_BACKEND_HOME_API = false;
const SIMULATE_HOME_ERROR = false;

function mapStatusToPlant(status: 'healthy' | 'warning' | 'critical'): Plant['status'] {
  if (status === 'warning' || status === 'critical') {
    return status;
  }
  return 'healthy';
}

function mapStatusToScanSeverity(status: 'healthy' | 'moderate' | 'severe'): ScanHistory['severity'] {
  return status;
}

function formatScanDate(scanDate: string): string {
  const date = new Date(scanDate);
  if (Number.isNaN(date.getTime())) return 'Không xác định';
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm} · ${date.toLocaleDateString('vi-VN')}`;
}

function mapSummaryToPlants(summary: HomeSummary): Plant[] {
  return summary.attentionPlants.map((plant) => ({
    id: String(plant.id),
    name: plant.name,
    latinName: plant.latinName || '',
    category: 'Cần theo dõi',
    image: plant.imageUrl || '',
    thumbnail: plant.imageUrl || '',
    healthScore: plant.healthScore,
    lastScanned: plant.lastScanned || 'Chưa quét',
    location: plant.location || 'Chưa cập nhật',
    daysTracked: 0,
    totalScans: 0,
    status: mapStatusToPlant(plant.status),
    notes: '',
  }));
}

function mapSummaryToScans(summary: HomeSummary): ScanHistory[] {
  return summary.recentScans.map((scan) => ({
    id: String(scan.id),
    diseaseKey: undefined,
    plantName: scan.plantName,
    date: formatScanDate(scan.scannedAt),
    scanDateISO: scan.scannedAt,
    result: scan.resultName,
    severity: mapStatusToScanSeverity(scan.status),
    image: scan.imageUrl || '',
    confidence: scan.confidence,
    predictedStage: 'unknown',
    forecastStage7d: 'unknown',
    affectedAreaSnapshot: undefined,
  }));
}

function useCountUpDelay() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 700);
    return () => clearTimeout(timer);
  }, []);

  return isReady;
}

async function fetchMockHomeSummary(): Promise<HomeSummary> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  if (SIMULATE_HOME_ERROR) {
    throw new Error('Không thể tải dữ liệu trang chủ');
  }
  return MOCK_HOME_SUMMARY;
}

function HomeLoadingState() {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Đang tải dữ liệu trang chủ...</Text>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
      <View style={styles.skeletonCta} />
      <View style={styles.skeletonTip} />
    </View>
  );
}

function HomeErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
        <Text style={styles.retryText}>Thử lại</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const authUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [homeData, setHomeData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipVisible, setTipVisible] = useState(false);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const summary = USE_BACKEND_HOME_API && accessToken
        ? await fetchHomeSummaryApi(accessToken)
        : await fetchMockHomeSummary();

      const mergedUser = {
        ...summary.user,
        name: authUser?.name || summary.user.name,
        email: authUser?.email || summary.user.email,
        avatar: authUser?.avatar || summary.user.avatar,
      };

      setHomeData({ ...summary, user: mergedUser });
    } catch (err: any) {
      setError(err?.message || 'Vui lòng kiểm tra kết nối và thử lại.');
      setHomeData(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, authUser?.avatar, authUser?.email, authUser?.name]);

  useEffect(() => {
    loadHome().catch(() => undefined);
  }, [loadHome]);

  const plants = useMemo(() => (homeData ? mapSummaryToPlants(homeData) : []), [homeData]);
  const scans = useMemo(() => (homeData ? mapSummaryToScans(homeData) : []), [homeData]);

  const avgHealth = homeData?.stats.averageHealth ?? null;
  const scannedPlantsCount = homeData?.stats.scannedPlants ?? 0;
  const warningCount = homeData?.stats.alerts ?? 0;

  const isTipReady = useCountUpDelay();

  const handlePressScan = (scan: ScanHistory) => {
    const state = navigation.getState();
    const hasScanResultDetail = (state.routeNames as readonly string[]).includes('ScanResultDetail');

    if (hasScanResultDetail) {
      (navigation as any).navigate('ScanResultDetail', { scanId: scan.id });
      return;
    }

    if (scan.diseaseKey) {
      navigation.navigate('DiseaseDetail', { diseaseId: scan.diseaseKey });
      return;
    }

    Alert.alert('Chi tiết kết quả', 'Màn chi tiết kết quả sẽ sớm được cập nhật.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {loading ? (
          <HomeLoadingState />
        ) : error ? (
          <HomeErrorState message={error} onRetry={loadHome} />
        ) : homeData ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(420)}>
              <HomeHeader
                userName={homeData.user.name || 'Nông dân'}
                avatarUri={homeData.user.avatar}
                onPressNotifications={() => Alert.alert('Thông báo', 'Bạn chưa có thông báo mới.')}
                onPressProfile={() => navigation.navigate('MainTabs', { screen: 'Profile' } as any)}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(420)}>
              <StatsCards
                avgHealth={avgHealth}
                scannedPlantsCount={scannedPlantsCount}
                warningCount={warningCount}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(420)}>
              <ScanCTA onPress={() => navigation.navigate('Scan')} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(170).duration(420)} style={styles.tipBlock}>
              {isTipReady ? (
                <TodayTipCard
                  tip={homeData.todayTip}
                  onPress={() => setTipVisible(true)}
                />
              ) : (
                <View style={styles.tipSkeleton} />
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(220).duration(420)}>
              <AttentionPlants
                plants={plants}
                onPressPlant={(plantId) => navigation.navigate('PlantDetail', { plantId })}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(270).duration(420)}>
              <RecentScans
                scans={scans}
                onPressScan={handlePressScan}
                onPressViewAll={() => navigation.navigate('MainTabs', { screen: 'History' } as any)}
                onPressFirstScan={() => navigation.navigate('Scan')}
              />
            </Animated.View>
          </ScrollView>
        ) : (
          <HomeErrorState
            message="Không có dữ liệu hiển thị."
            onRetry={loadHome}
          />
        )}

        <TipDetailSheet
          visible={tipVisible}
          tip={homeData?.todayTip || null}
          onClose={() => setTipVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 110,
  },
  tipBlock: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  loadingWrap: {
    flex: 1,
    paddingTop: 42,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    marginBottom: 20,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  skeletonCard: {
    flex: 1,
    height: 108,
    borderRadius: 16,
    backgroundColor: '#ECE8E2',
  },
  skeletonCta: {
    height: 92,
    borderRadius: 22,
    backgroundColor: '#E8E4DE',
    marginBottom: 16,
  },
  skeletonTip: {
    height: 118,
    borderRadius: 20,
    backgroundColor: '#ECE8E2',
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonPressed: {
    backgroundColor: '#4C774B',
  },
  retryText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 13.5,
  },
  tipSkeleton: {
    height: 118,
    borderRadius: 20,
    backgroundColor: '#ECE8E2',
  },
});
