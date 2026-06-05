import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, SubscriptionStatus } from '../types';
import { useAuthStore } from '../stores/authStore';
import { fetchHomeSummaryApi } from '../api/home';
import { getSubscriptionStatusApi } from '../api/subscription';
import {
  HomeCareLog,
  HomeGardenSummary,
  HomeRecentActivity,
  HomeStats,
  HomeSummary,
  HomeTask,
  HomeTodayTip,
  HomeWeather,
} from '../types/home';
import { TipDetailSheet } from '../components/home/TipDetailSheet';
import { fetchWithCache } from '../utils/offlineCache';

type Nav = StackNavigationProp<RootStackParamList>;
type IconName = keyof typeof Ionicons.glyphMap;
type Translate = (key: string, options?: Record<string, unknown>) => string;

const GREEN = '#006B2D';
const DEEP_GREEN = '#004F1C';
const BG = '#FFFDF8';

function getGreeting(t: Translate): string {
  const hour = new Date().getHours();
  if (hour < 11) return t('home.greeting.morning');
  if (hour < 14) return t('home.greeting.noon');
  if (hour < 18) return t('home.greeting.afternoon');
  return t('home.greeting.evening');
}

function formatNumber(value: number | null | undefined, suffix = '', digits = 0): string {
  if (value == null || Number.isNaN(value)) return '--';
  return `${Number(value).toFixed(digits)}${suffix}`;
}

function formatRelativeTime(value: string | null | undefined, t: Translate, locale: string): string {
  if (!value) return t('common.noData');
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return t('common.noData');

  const diffMs = Date.now() - dt.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('home.time.justNow');
  if (minutes < 60) return t('home.time.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('home.time.hoursAgo', { count: hours });

  const days = Math.floor(hours / 24);
  if (days < 7) return t('home.time.daysAgo', { count: days });

  return dt.toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN');
}

function formatClock(value?: string | null): string {
  if (!value) return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '--';
  return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
}

function Header({
  userName,
  avatar,
  onProfile,
  onNotifications,
}: {
  userName: string;
  avatar?: string | null;
  onProfile: () => void;
  onNotifications: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <Pressable onPress={onProfile} style={styles.avatarShell}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="leaf" size={30} color={GREEN} />
          </View>
        )}
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.greeting}>{getGreeting(t)}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.userName}>
          {userName}
        </Text>
      </View>

      <Pressable
        onPress={onNotifications}
        style={styles.bellButton}
      >
        <Ionicons name="notifications-outline" size={23} color="#111827" />
      </Pressable>
    </View>
  );
}

function PremiumCard({
  subscription,
  onPress,
}: {
  subscription: SubscriptionStatus | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const quotaText = subscription
    ? t('home.premium.quota', {
      remaining: subscription.remainingScans,
      limit: subscription.dailyScanLimit,
    })
    : t('home.premium.prompt');
  const isPaid = subscription?.tier && subscription.tier !== 'free';

  return (
    <LinearGradient
      colors={['#006626', '#004E1C', '#003B16']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.premiumCard}
    >
      <View style={styles.premiumBadge}>
        <Ionicons name="diamond" size={17} color="#FFD94A" />
        <Text style={styles.premiumBadgeText}>
          {isPaid ? t('home.premium.badgePaid', { tier: String(subscription?.tier).toUpperCase() }) : t('home.premium.badgeFree')}
        </Text>
      </View>

      <Text style={styles.premiumTitle}>{isPaid ? t('home.premium.activeTitle') : t('home.premium.unlockTitle')}</Text>
      <Text style={styles.premiumDescription}>{t('home.premium.description', { quota: quotaText })}</Text>

      <Pressable onPress={onPress} style={styles.upgradeButton}>
        <Text style={styles.upgradeText}>{isPaid ? t('home.premium.viewPlan') : t('home.premium.upgrade')}</Text>
        <Ionicons name="arrow-forward" size={21} color={DEEP_GREEN} />
      </Pressable>

      <Ionicons name="leaf-outline" size={128} color="rgba(194, 220, 74, 0.24)" style={styles.premiumLeafA} />
    </LinearGradient>
  );
}

function ScanCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={['#F7FFE9', '#EEFFD9', '#F9FFF0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.scanCard}
    >
      <View style={styles.scanCopy}>
        <Text style={styles.scanTitle}>{t('home.scanCard.title')}</Text>
        <Text style={styles.scanDescription}>{t('home.scanCard.description')}</Text>
        <Pressable onPress={onPress} style={styles.scanButton}>
          <Ionicons name="camera" size={21} color={DEEP_GREEN} />
          <Text style={styles.scanButtonText}>{t('home.scanCard.button')}</Text>
        </Pressable>
      </View>

      <View style={styles.scanIllustration}>
        <View style={styles.scanBubbleLarge} />
        <Ionicons name="search-circle" size={78} color="#123C3A" style={styles.scanLens} />
        <Ionicons name="leaf" size={48} color="#4EAF4C" style={styles.scanLeaf} />
      </View>
    </LinearGradient>
  );
}

function weatherIcon(code?: number | null): IconName {
  if (code == null) return 'cloud-offline-outline';
  if (code === 0 || code === 1) return 'sunny';
  if (code === 2 || code === 3) return 'partly-sunny';
  if (code >= 45 && code <= 48) return 'cloud-outline';
  if (code >= 51 && code <= 82) return 'rainy';
  if (code >= 95) return 'thunderstorm';
  return 'partly-sunny';
}

function WeatherCard({ weather }: { weather: HomeWeather }) {
  const { t } = useTranslation();
  const hasWeather = weather.temperatureC != null || weather.humidityPercent != null || weather.windSpeedKmh != null;

  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherIconBlock}>
        <Ionicons name={weatherIcon(weather.weatherCode)} size={44} color="#F6B900" />
      </View>
      <View style={styles.weatherMain}>
        <Text style={styles.weatherTitle}>{t('home.weather.title')}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={17} color="#8A8F98" />
          <Text style={styles.locationText}>{weather.location}</Text>
        </View>
        <View style={styles.tempRow}>
          <Text style={styles.tempText}>{formatNumber(weather.temperatureC, '°C', 0)}</Text>
          <Text style={styles.weatherStatus}>{hasWeather ? weather.condition : t('common.noData')}</Text>
        </View>
      </View>
      <View style={styles.verticalDivider} />
      <WeatherMetric icon="water-outline" value={formatNumber(weather.humidityPercent, '%', 0)} label={t('home.weather.humidity')} />
      <View style={styles.verticalDivider} />
      <WeatherMetric icon="speedometer-outline" value={formatNumber(weather.windSpeedKmh, ' km/h', 0)} label={t('home.weather.wind')} />
    </View>
  );
}

function WeatherMetric({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.weatherMetric}>
      <Ionicons name={icon} size={23} color="#169CFF" />
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.weatherMetricValue}>
        {value}
      </Text>
      <Text style={styles.weatherMetricLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionHeader}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.sectionTitle}>
        {title}
      </Text>
      {onPress ? (
        <Pressable onPress={onPress} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>{t('home.sections.viewAll')}</Text>
          <Ionicons name="chevron-forward" size={19} color={GREEN} />
        </Pressable>
      ) : null}
    </View>
  );
}

function GardenSummaryCard({
  summary,
  stats,
  onViewAll,
}: {
  summary: HomeGardenSummary;
  stats: HomeStats;
  onViewAll: () => void;
}) {
  const { t, i18n } = useTranslation();
  const items = [
    {
      icon: 'pulse-outline' as IconName,
      title: t('home.stats.averageHealth'),
      value: formatNumber(stats.averageHealth, '%', 0),
      state: stats.averageHealth == null ? t('common.noData') : t('home.stats.fromGarden'),
      color: '#00A651',
      bg: '#F8FFF5',
      border: '#E2F1D7',
    },
    {
      icon: 'scan-outline' as IconName,
      title: t('home.stats.scannedPlants'),
      value: t('home.stats.scannedPlantsValue', { count: stats.scannedPlants }),
      state: stats.scannedPlants > 0 ? t('home.stats.scanHistory') : t('home.stats.notScanned'),
      color: '#169CFF',
      bg: '#EFF9FF',
      border: '#D6EDFF',
    },
    {
      icon: 'leaf' as IconName,
      title: t('home.stats.attentionPlants'),
      value: t('home.stats.scannedPlantsValue', { count: summary.attentionPlants }),
      state: summary.attentionPlants > 0 ? t('home.stats.needsCheck') : t('home.stats.stable'),
      color: '#44A340',
      bg: '#F8FFF5',
      border: '#E2F1D7',
      warning: summary.attentionPlants > 0,
    },
    {
      icon: 'time' as IconName,
      title: t('home.stats.latestScan'),
      value: summary.lastScanAt ? formatRelativeTime(summary.lastScanAt, t, i18n.language) : '--',
      state: summary.lastScanAt ? formatClock(summary.lastScanAt) : t('home.stats.notScanned'),
      color: '#7567FF',
      bg: '#FBF8FF',
      border: '#E6E0FB',
    },
  ];

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title={t('home.sections.gardenSummary')} onPress={onViewAll} />
      <View style={styles.summaryGrid}>
        {items.map((item) => (
          <View key={item.title} style={[styles.summaryCard, { backgroundColor: item.bg, borderColor: item.border }]}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name={item.icon} size={25} color={item.color} />
            </View>
            <View style={styles.summaryText}>
              <Text numberOfLines={2} style={styles.summaryLabel}>
                {item.title}
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>
                {item.value}
              </Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: item.warning ? '#FF8A00' : '#00A651' }]} />
                <Text numberOfLines={1} style={styles.summaryState}>
                  {item.state}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyInline({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.emptyInline}>
      <Ionicons name={icon} size={20} color="#7D8580" />
      <Text style={styles.emptyInlineText}>{text}</Text>
    </View>
  );
}

function RecentActivity({ activities }: { activities: HomeRecentActivity[] }) {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{t('home.sections.recentActivity')}</Text>
      {activities.length === 0 ? (
        <EmptyInline icon="time-outline" text={t('home.empty.noRealActivity')} />
      ) : (
        <View style={styles.listCard}>
          {activities.slice(0, 4).map((item, index) => (
            <React.Fragment key={item.id}>
              <ActivityRow item={item} />
              {index < Math.min(activities.length, 4) - 1 ? <View style={styles.listDivider} /> : null}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

function ActivityRow({ item }: { item: HomeRecentActivity }) {
  const { t, i18n } = useTranslation();
  const isScan = item.activityType === 'scan';
  const tint = item.status === 'severe' ? '#D73333' : item.status === 'moderate' ? '#FF8A00' : '#00A651';

  return (
    <View style={styles.activityRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={isScan ? 'scan-outline' : 'journal-outline'} size={19} color={tint} />
      </View>
      <View style={styles.activityText}>
        <Text numberOfLines={1} style={styles.activityTitle}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={[styles.activitySubtitle, { color: tint }]}>
          {item.subtitle || (isScan ? t('home.activity.scan') : t('home.activity.careLog'))}
        </Text>
      </View>
      <Text style={styles.activityTime}>{formatRelativeTime(item.occurredAt, t, i18n.language)}</Text>
    </View>
  );
}

function TodayTasks({ tasks, onViewAll }: { tasks: HomeTask[]; onViewAll: () => void }) {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title={t('home.sections.todayTasks')} onPress={onViewAll} />
      {tasks.length === 0 ? (
        <EmptyInline icon="checkmark-circle-outline" text={t('home.empty.noTasks')} />
      ) : (
        <View style={styles.taskRow}>
          {tasks.slice(0, 2).map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </View>
      )}
    </View>
  );
}

function taskIcon(taskType: string): IconName {
  if (taskType === 'watering') return 'water-outline';
  if (taskType === 'inspection') return 'bug-outline';
  if (taskType === 'fertilizing') return 'nutrition-outline';
  return 'leaf-outline';
}

function TaskCard({ task }: { task: HomeTask }) {
  const { t } = useTranslation();

  return (
    <Pressable style={styles.taskCard} onPress={() => Alert.alert(t('home.task.alertTitle'), task.title)}>
      <Ionicons name={taskIcon(task.taskType)} size={21} color={GREEN} />
      <Text numberOfLines={1} style={styles.taskTitle}>
        {task.title}
      </Text>
      <Text numberOfLines={1} style={styles.taskPlant}>
        {task.plantName || t('home.task.noPlant')}
      </Text>
      <View style={styles.taskTimePill}>
        <Text style={styles.taskTime}>{formatClock(task.dueAt)}</Text>
      </View>
    </Pressable>
  );
}

function AiTip({ tip, onPress }: { tip: HomeTodayTip | null; onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={tip ? onPress : undefined}>
      <LinearGradient colors={['#F0FFE9', '#FBFFF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.aiTipCard}>
        <View style={styles.aiIconCircle}>
          <Ionicons name="chatbubble-ellipses" size={22} color={GREEN} />
        </View>
        <View style={styles.aiTipText}>
          <Text style={styles.aiTipTitle}>{t('home.tip.title')}</Text>
          <Text numberOfLines={2} style={styles.aiTipBody}>
            {tip ? tip.summary : t('home.empty.noTip')}
          </Text>
        </View>
        <Ionicons name={tip ? 'chevron-forward' : 'information-circle-outline'} size={23} color={GREEN} />
      </LinearGradient>
    </Pressable>
  );
}

function CareLog({ logs, onViewAll }: { logs: HomeCareLog[]; onViewAll: () => void }) {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title={t('home.sections.careLog')} onPress={onViewAll} />
      {logs.length === 0 ? (
        <EmptyInline icon="journal-outline" text={t('home.empty.noCareLog')} />
      ) : (
        <View style={styles.listCard}>
          {logs.slice(0, 4).map((item, index) => (
            <React.Fragment key={item.id}>
              <CareLogRow item={item} />
              {index < Math.min(logs.length, 4) - 1 ? <View style={styles.listDivider} /> : null}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

function CareLogRow({ item }: { item: HomeCareLog }) {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.careRow}>
      <View style={styles.rowIcon}>
        <Ionicons name="leaf-outline" size={18} color={GREEN} />
      </View>
      <View style={styles.activityText}>
        <Text numberOfLines={1} style={styles.activityTitle}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.careSubtitle}>
          {item.description || item.plantName || item.logType}
        </Text>
      </View>
      <Text style={styles.careTime}>{formatRelativeTime(item.performedAt, t, i18n.language)}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [home, setHome] = useState<HomeSummary | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);

  const loadHome = useCallback(
    async (showLoading: boolean) => {
      if (!accessToken) return;
      if (showLoading) setLoading(true);
      setError(null);
      setFromCache(false);
      const cacheUserId = authUser?.id || 'me';
      const [homeResult, subscriptionResult] = await Promise.allSettled([
        fetchWithCache(`home-summary:${cacheUserId}`, () => fetchHomeSummaryApi(accessToken)),
        getSubscriptionStatusApi(accessToken),
      ]);

      if (homeResult.status === 'fulfilled') {
        setHome(homeResult.value.data);
        setFromCache(homeResult.value.fromCache);
        if (homeResult.value.fromCache) {
          setError('Đang hiển thị dữ liệu đã lưu gần nhất.');
        }
      } else {
        setError(homeResult.reason instanceof Error ? homeResult.reason.message : t('home.alerts.loadFailed'));
      }

      if (subscriptionResult.status === 'fulfilled') {
        setSubscription(subscriptionResult.value);
      }

      if (showLoading) setLoading(false);
    },
    [accessToken, authUser?.id, t]
  );

  useEffect(() => {
    loadHome(true).catch((err) => {
      setLoading(false);
      setError(err instanceof Error ? err.message : t('home.alerts.loadFailed'));
    });
  }, [loadHome, t]);

  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        loadHome(false).catch(() => undefined);
      }
    }, [accessToken, loadHome])
  );

  const handleNotificationsPress = useCallback(() => {
    if (!accessToken) {
      Alert.alert(t('home.alerts.loginRequiredTitle'), t('home.alerts.loginRequiredBody'));
      return;
    }
    navigation.navigate('Notifications');
  }, [accessToken, navigation, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHome(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadHome]);

  const displayName = useMemo(() => {
    const rawName = home?.user.name?.trim() || authUser?.name?.trim() || t('common.user');
    return rawName.length > 18 ? rawName.split(' ').slice(-3).join(' ') : rawName;
  }, [authUser?.name, home?.user.name, t]);

  const avatar = home?.user.avatar || authUser?.avatar || null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
      >
        <Header
          userName={displayName}
          avatar={avatar}
          onProfile={() => navigation.navigate('MainTabs', { screen: 'Profile' } as any)}
          onNotifications={handleNotificationsPress}
        />

        {loading && !home ? (
          <View style={styles.statePanel}>
            <ActivityIndicator color={GREEN} />
            <Text style={styles.stateText}>{t('home.alerts.loading')}</Text>
          </View>
        ) : null}

        {error && !home ? (
          <View style={styles.statePanel}>
            <Ionicons name="cloud-offline-outline" size={26} color="#B45309" />
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => loadHome(true)} style={styles.retryButton}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {home ? (
          <>
            {fromCache ? (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline-outline" size={16} color="#8A5A00" />
                <Text style={styles.offlineBadgeText}>Dữ liệu đã lưu</Text>
              </View>
            ) : null}
            <PremiumCard subscription={subscription} onPress={() => navigation.navigate('UpgradePlan')} />
            <ScanCard onPress={() => navigation.navigate('Scan')} />
            <WeatherCard weather={home.weather} />
            <GardenSummaryCard
              summary={home.gardenSummary}
              stats={home.stats}
              onViewAll={() => navigation.navigate('MainTabs', { screen: 'Garden' } as any)}
            />
            <RecentActivity activities={home.recentActivities} />
            <TodayTasks tasks={home.todayTasks} onViewAll={() => navigation.navigate('CareCenter', { initialTab: 'tasks' })} />
            <AiTip
              tip={home.todayTip}
              onPress={() => {
                if (home.todayTip) setTipVisible(true);
              }}
            />
            <CareLog logs={home.careLogs} onViewAll={() => navigation.navigate('CareCenter', { initialTab: 'logs' })} />
          </>
        ) : null}
      </ScrollView>

      <TipDetailSheet visible={tipVisible} tip={home?.todayTip || null} onClose={() => setTipVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 132,
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  avatarShell: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D7EFD1',
    backgroundColor: '#EAF9E4',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 19,
    lineHeight: 24,
    color: '#252A35',
    fontWeight: '500',
  },
  userName: {
    marginTop: 3,
    fontSize: 27,
    lineHeight: 33,
    color: DEEP_GREEN,
    fontWeight: '900',
  },
  bellButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  premiumCard: {
    minHeight: 220,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#053D1A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  premiumBadge: {
    height: 40,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#88A932',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  premiumBadgeText: {
    color: '#F8D94C',
    fontSize: 14,
    fontWeight: '900',
  },
  premiumTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    marginBottom: 10,
  },
  premiumDescription: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    maxWidth: '72%',
  },
  upgradeButton: {
    minHeight: 46,
    alignSelf: 'flex-start',
    borderRadius: 23,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upgradeText: {
    color: DEEP_GREEN,
    fontWeight: '900',
    fontSize: 14,
  },
  premiumLeafA: {
    position: 'absolute',
    right: -16,
    bottom: 4,
  },
  scanCard: {
    minHeight: 188,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0F0C8',
  },
  scanCopy: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scanTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    color: '#102D28',
    marginBottom: 8,
  },
  scanDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#59706A',
    marginBottom: 14,
    maxWidth: 210,
  },
  scanButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D4EFC1',
  },
  scanButtonText: {
    color: DEEP_GREEN,
    fontSize: 14,
    fontWeight: '900',
  },
  scanIllustration: {
    width: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBubbleLarge: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#D8F8B7',
  },
  scanLens: {
    position: 'absolute',
    right: 16,
    bottom: 34,
  },
  scanLeaf: {
    position: 'absolute',
    top: 36,
    left: 22,
  },
  weatherCard: {
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEDE8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 18,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  weatherIconBlock: {
    width: 58,
    alignItems: 'center',
  },
  weatherMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    color: '#737985',
    fontSize: 13,
    fontWeight: '600',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  tempText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  weatherStatus: {
    color: '#737985',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  verticalDivider: {
    width: 1,
    height: 56,
    backgroundColor: '#ECEDE8',
  },
  weatherMetric: {
    width: 66,
    alignItems: 'center',
    gap: 3,
  },
  weatherMetricValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  weatherMetricLabel: {
    color: '#8A8F98',
    fontSize: 11,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    color: '#111827',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48.5%',
    minHeight: 118,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  summaryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#5E6671',
    fontWeight: '700',
    minHeight: 32,
  },
  summaryValue: {
    fontSize: 20,
    lineHeight: 26,
    color: '#111827',
    fontWeight: '900',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00A651',
  },
  summaryState: {
    flex: 1,
    minWidth: 0,
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyInline: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E7DF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  emptyInlineText: {
    color: '#66706A',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E7DF',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  activityRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  activityTime: {
    width: 70,
    color: '#737985',
    fontSize: 11,
    textAlign: 'right',
    fontWeight: '600',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#EEF1EC',
    marginLeft: 60,
  },
  taskRow: {
    flexDirection: 'row',
    gap: 10,
  },
  taskCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2F1D7',
    backgroundColor: '#F8FFF5',
    padding: 12,
  },
  taskTitle: {
    marginTop: 8,
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  taskPlant: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  taskTimePill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  taskTime: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  aiTipCard: {
    minHeight: 94,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D9EFD0',
  },
  aiIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTipText: {
    flex: 1,
    minWidth: 0,
  },
  aiTipTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  aiTipBody: {
    color: '#59655E',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  careRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  careSubtitle: {
    color: '#737985',
    fontSize: 12,
    fontWeight: '700',
  },
  careTime: {
    width: 72,
    color: '#737985',
    fontSize: 11,
    textAlign: 'right',
    fontWeight: '600',
  },
  statePanel: {
    minHeight: 160,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E7DF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginBottom: 18,
    gap: 10,
  },
  stateText: {
    color: '#59655E',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  offlineBadge: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: '#FFF7DB',
    borderWidth: 1,
    borderColor: '#F2D58D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    marginBottom: 12,
  },
  offlineBadgeText: {
    color: '#8A5A00',
    fontSize: 12,
    fontWeight: '800',
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#EAF9E4',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
});
