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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
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

type Nav = StackNavigationProp<RootStackParamList>;
type IconName = keyof typeof Ionicons.glyphMap;

const GREEN = '#006B2D';
const DEEP_GREEN = '#004F1C';
const BG = '#FFFDF8';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng,';
  if (hour < 14) return 'Chào buổi trưa,';
  if (hour < 18) return 'Chào buổi chiều,';
  return 'Chào buổi tối,';
}

function formatNumber(value: number | null | undefined, suffix = '', digits = 0): string {
  if (value == null || Number.isNaN(value)) return '--';
  return `${Number(value).toFixed(digits)}${suffix}`;
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return 'Chưa có dữ liệu';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'Chưa có dữ liệu';

  const diffMs = Date.now() - dt.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;

  return dt.toLocaleDateString('vi-VN');
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
}: {
  userName: string;
  avatar?: string | null;
  onProfile: () => void;
}) {
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
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.userName}>
          {userName}
        </Text>
      </View>

      <Pressable
        onPress={() => Alert.alert('Thông báo', 'Bạn chưa có thông báo mới.')}
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
  const quotaText = subscription
    ? `Còn ${subscription.remainingScans}/${subscription.dailyScanLimit} lượt quét hôm nay`
    : 'Mở thêm lượt quét AI mỗi ngày';
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
        <Text style={styles.premiumBadgeText}>{isPaid ? String(subscription?.tier).toUpperCase() : 'PREMIUM'}</Text>
      </View>

      <Text style={styles.premiumTitle}>{isPaid ? 'Gói đang hoạt động' : 'Mở khóa tiềm năng'}</Text>
      <Text style={styles.premiumDescription}>
        {quotaText}
        {'\n'}và gợi ý chăm sóc cây bằng AI.
      </Text>

      <Pressable onPress={onPress} style={styles.upgradeButton}>
        <Text style={styles.upgradeText}>{isPaid ? 'Xem gói của tôi' : 'Nâng cấp ngay'}</Text>
        <Ionicons name="arrow-forward" size={21} color={DEEP_GREEN} />
      </Pressable>

      <Ionicons name="leaf-outline" size={128} color="rgba(194, 220, 74, 0.24)" style={styles.premiumLeafA} />
    </LinearGradient>
  );
}

function ScanCard({ onPress }: { onPress: () => void }) {
  return (
    <LinearGradient
      colors={['#F7FFE9', '#EEFFD9', '#F9FFF0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.scanCard}
    >
      <View style={styles.scanCopy}>
        <Text style={styles.scanTitle}>Kiểm tra sức khỏe{'\n'}cây trồng</Text>
        <Text style={styles.scanDescription}>
          Quét lá hoặc đất để phát hiện nhanh sâu bệnh và nhận khuyến nghị.
        </Text>
        <Pressable onPress={onPress} style={styles.scanButton}>
          <Ionicons name="camera" size={21} color={DEEP_GREEN} />
          <Text style={styles.scanButtonText}>Bắt đầu quét</Text>
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
  const hasWeather = weather.temperatureC != null || weather.humidityPercent != null || weather.windSpeedKmh != null;

  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherIconBlock}>
        <Ionicons name={weatherIcon(weather.weatherCode)} size={44} color="#F6B900" />
      </View>
      <View style={styles.weatherMain}>
        <Text style={styles.weatherTitle}>Thời tiết hôm nay</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={17} color="#8A8F98" />
          <Text style={styles.locationText}>{weather.location}</Text>
        </View>
        <View style={styles.tempRow}>
          <Text style={styles.tempText}>{formatNumber(weather.temperatureC, '°C', 0)}</Text>
          <Text style={styles.weatherStatus}>{hasWeather ? weather.condition : 'Chưa có dữ liệu'}</Text>
        </View>
      </View>
      <View style={styles.verticalDivider} />
      <WeatherMetric icon="water-outline" value={formatNumber(weather.humidityPercent, '%', 0)} label="Độ ẩm" />
      <View style={styles.verticalDivider} />
      <WeatherMetric icon="speedometer-outline" value={formatNumber(weather.windSpeedKmh, ' km/h', 0)} label="Gió" />
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
  return (
    <View style={styles.sectionHeader}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.sectionTitle}>
        {title}
      </Text>
      {onPress ? (
        <Pressable onPress={onPress} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>Xem tất cả</Text>
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
  const items = [
    {
      icon: 'pulse-outline' as IconName,
      title: 'Sức khỏe trung bình',
      value: formatNumber(stats.averageHealth, '%', 0),
      state: stats.averageHealth == null ? 'Chưa có dữ liệu' : 'Từ vườn của bạn',
      color: '#00A651',
      bg: '#F8FFF5',
      border: '#E2F1D7',
    },
    {
      icon: 'scan-outline' as IconName,
      title: 'Cây đã quét',
      value: `${stats.scannedPlants} cây`,
      state: stats.scannedPlants > 0 ? 'Có lịch sử quét' : 'Chưa quét',
      color: '#169CFF',
      bg: '#EFF9FF',
      border: '#D6EDFF',
    },
    {
      icon: 'leaf' as IconName,
      title: 'Cây cần chú ý',
      value: `${summary.attentionPlants} cây`,
      state: summary.attentionPlants > 0 ? 'Cần kiểm tra' : 'Ổn định',
      color: '#44A340',
      bg: '#F8FFF5',
      border: '#E2F1D7',
      warning: summary.attentionPlants > 0,
    },
    {
      icon: 'time' as IconName,
      title: 'Lần quét gần nhất',
      value: summary.lastScanAt ? formatRelativeTime(summary.lastScanAt) : '--',
      state: summary.lastScanAt ? formatClock(summary.lastScanAt) : 'Chưa quét',
      color: '#7567FF',
      bg: '#FBF8FF',
      border: '#E6E0FB',
    },
  ];

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="Tóm tắt khu vườn" onPress={onViewAll} />
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
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
      {activities.length === 0 ? (
        <EmptyInline icon="time-outline" text="Chưa có hoạt động thật để hiển thị." />
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
          {item.subtitle || (isScan ? 'Lần quét mới' : 'Nhật ký chăm sóc')}
        </Text>
      </View>
      <Text style={styles.activityTime}>{formatRelativeTime(item.occurredAt)}</Text>
    </View>
  );
}

function TodayTasks({ tasks }: { tasks: HomeTask[] }) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Việc cần làm hôm nay</Text>
      {tasks.length === 0 ? (
        <EmptyInline icon="checkmark-circle-outline" text="Chưa có việc chăm sóc đến hạn hôm nay." />
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
  return (
    <Pressable style={styles.taskCard} onPress={() => Alert.alert('Việc chăm sóc', task.title)}>
      <Ionicons name={taskIcon(task.taskType)} size={21} color={GREEN} />
      <Text numberOfLines={1} style={styles.taskTitle}>
        {task.title}
      </Text>
      <Text numberOfLines={1} style={styles.taskPlant}>
        {task.plantName || 'Không gắn cây'}
      </Text>
      <View style={styles.taskTimePill}>
        <Text style={styles.taskTime}>{formatClock(task.dueAt)}</Text>
      </View>
    </Pressable>
  );
}

function AiTip({ tip, onPress }: { tip: HomeTodayTip | null; onPress: () => void }) {
  return (
    <Pressable onPress={tip ? onPress : undefined}>
      <LinearGradient colors={['#F0FFE9', '#FBFFF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.aiTipCard}>
        <View style={styles.aiIconCircle}>
          <Ionicons name="chatbubble-ellipses" size={22} color={GREEN} />
        </View>
        <View style={styles.aiTipText}>
          <Text style={styles.aiTipTitle}>Mẹo AI hôm nay</Text>
          <Text numberOfLines={2} style={styles.aiTipBody}>
            {tip ? tip.summary : 'Chưa có mẹo chăm sóc thật cho hôm nay.'}
          </Text>
        </View>
        <Ionicons name={tip ? 'chevron-forward' : 'information-circle-outline'} size={23} color={GREEN} />
      </LinearGradient>
    </Pressable>
  );
}

function CareLog({ logs }: { logs: HomeCareLog[] }) {
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="Nhật ký chăm sóc" />
      {logs.length === 0 ? (
        <EmptyInline icon="journal-outline" text="Chưa có nhật ký chăm sóc thật." />
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
      <Text style={styles.careTime}>{formatRelativeTime(item.performedAt)}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const authUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [home, setHome] = useState<HomeSummary | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipVisible, setTipVisible] = useState(false);

  const loadHome = useCallback(
    async (showLoading: boolean) => {
      if (!accessToken) return;
      if (showLoading) setLoading(true);
      setError(null);
      const [homeResult, subscriptionResult] = await Promise.allSettled([
        fetchHomeSummaryApi(accessToken),
        getSubscriptionStatusApi(accessToken),
      ]);

      if (homeResult.status === 'fulfilled') {
        setHome(homeResult.value);
      } else {
        setError(homeResult.reason instanceof Error ? homeResult.reason.message : 'Không tải được dữ liệu trang chủ.');
      }

      if (subscriptionResult.status === 'fulfilled') {
        setSubscription(subscriptionResult.value);
      }

      if (showLoading) setLoading(false);
    },
    [accessToken]
  );

  useEffect(() => {
    loadHome(true).catch((err) => {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu trang chủ.');
    });
  }, [loadHome]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHome(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadHome]);

  const displayName = useMemo(() => {
    const rawName = home?.user.name?.trim() || authUser?.name?.trim() || 'Người dùng';
    return rawName.length > 18 ? rawName.split(' ').slice(-3).join(' ') : rawName;
  }, [authUser?.name, home?.user.name]);

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
        />

        {loading && !home ? (
          <View style={styles.statePanel}>
            <ActivityIndicator color={GREEN} />
            <Text style={styles.stateText}>Đang tải dữ liệu trang chủ...</Text>
          </View>
        ) : null}

        {error && !home ? (
          <View style={styles.statePanel}>
            <Ionicons name="cloud-offline-outline" size={26} color="#B45309" />
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => loadHome(true)} style={styles.retryButton}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        {home ? (
          <>
            <PremiumCard subscription={subscription} onPress={() => navigation.navigate('UpgradePlan')} />
            <ScanCard onPress={() => navigation.navigate('Scan')} />
            <WeatherCard weather={home.weather} />
            <GardenSummaryCard
              summary={home.gardenSummary}
              stats={home.stats}
              onViewAll={() => navigation.navigate('MainTabs', { screen: 'Garden' } as any)}
            />
            <RecentActivity activities={home.recentActivities} />
            <TodayTasks tasks={home.todayTasks} />
            <AiTip
              tip={home.todayTip}
              onPress={() => {
                if (home.todayTip) setTipVisible(true);
              }}
            />
            <CareLog logs={home.careLogs} />
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
