import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, SubscriptionStatus, UserPlanKey } from '../types';
import { createUserVnpayPaymentApi, getSubscriptionStatusApi, getUserPaymentStatusApi } from '../api/subscription';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

type BillingCycle = 'monthly' | 'yearly';
type PaidPlan = 'personal' | 'pro';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const GREEN = '#007C39';
const DARK = '#171326';
const BG = '#FFFDF8';
const CARD = '#FFFFFF';
const BORDER = '#E3EBDD';
const MUTED = '#6F7180';

const PLAN_DATA = {
  free: {
    title: 'Miễn phí',
    price: 0,
    scanLimit: 5,
    features: ['5 lượt quét/ngày', 'Lưu lịch sử quét', 'Gợi ý chăm sóc cơ bản'],
  },
  personal: {
    title: 'Cá nhân',
    monthlyPrice: 39000,
    yearlyPrice: 390000,
    scanLimit: 30,
    badge: 'Phổ biến',
    features: [
      '30 lượt quét/ngày',
      'Phân tích AI đầy đủ',
      'Gợi ý chăm sóc theo giai đoạn bệnh',
      'Ưu tiên gợi ý sản phẩm phù hợp',
    ],
  },
  pro: {
    title: 'Pro',
    monthlyPrice: 99000,
    yearlyPrice: 990000,
    scanLimit: 100,
    features: [
      '100 lượt quét/ngày',
      'Phù hợp nhà vườn dùng thường xuyên',
      'Theo dõi nhiều cây hơn',
      'Báo cáo lịch sử chi tiết',
    ],
  },
};

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function tierLabel(tier?: string): string {
  if (tier === 'personal') return 'Cá nhân';
  if (tier === 'pro') return 'Pro';
  return 'Miễn phí';
}

function planKeyFor(plan: PaidPlan, cycle: BillingCycle): UserPlanKey {
  return `${plan}_${cycle}` as UserPlanKey;
}

export default function UpgradePlanScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const token = useAuthStore((state) => state.accessToken);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>('personal');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const nextStatus = await getSubscriptionStatusApi(token);
      setSubscription(nextStatus);
      if (nextStatus.tier === 'personal') setSelectedPlan('pro');
      else setSelectedPlan('personal');
    } catch (err: any) {
      setError(err?.message || 'Không tải được trạng thái gói.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStatus().catch(() => undefined);
  }, [loadStatus]);

  const currentTier = subscription?.tier || 'free';
  const selectedPlanData = PLAN_DATA[selectedPlan];
  const selectedPrice = billingCycle === 'yearly' ? selectedPlanData.yearlyPrice : selectedPlanData.monthlyPrice;
  const isSelectedCurrentPlan = currentTier === selectedPlan && Boolean(subscription?.expiresAt);
  const progress = useMemo(() => {
    const limit = subscription?.dailyScanLimit || PLAN_DATA.free.scanLimit;
    const remaining = subscription?.remainingScans ?? PLAN_DATA.free.scanLimit;
    return Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
  }, [subscription]);

  const startPayment = async () => {
    if (!token || paying) return;
    if (isSelectedCurrentPlan) {
      Alert.alert('Gói đang hoạt động', `Bạn đang dùng gói ${tierLabel(currentTier)}.`);
      return;
    }
    setPaying(true);
    try {
      const payment = await createUserVnpayPaymentApi(token, planKeyFor(selectedPlan, billingCycle));
      await WebBrowser.openBrowserAsync(payment.paymentUrl);
      const tx = await getUserPaymentStatusApi(token, payment.txnRef);
      const nextStatus = await getSubscriptionStatusApi(token);
      setSubscription(nextStatus);
      Alert.alert(
        'Trạng thái thanh toán',
        tx.status === 'success'
          ? `Thanh toán thành công. Gói ${tierLabel(payment.tier)} đã được kích hoạt.`
          : 'Giao dịch chưa hoàn tất. Vui lòng kiểm tra lại sau khi VNPAY gửi IPN.'
      );
    } catch (err: any) {
      Alert.alert('Lỗi thanh toán', err?.message || 'Không tạo được thanh toán VNPAY.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>Nâng cấp gói</Text>
        <Pressable onPress={() => loadStatus().catch(() => undefined)} style={styles.iconButton}>
          <Ionicons name="refresh-outline" size={19} color={DARK} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={GREEN} />
          <Text style={styles.stateText}>Đang tải gói quét AI...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadStatus().catch(() => undefined)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="scan-outline" size={24} color={GREEN} />
              </View>
              <Text style={styles.heroTitle}>Quét nhiều hơn, chăm cây tốt hơn</Text>
              <Text style={styles.heroText}>Mở thêm lượt quét AI mỗi ngày để theo dõi sức khỏe cây trồng liên tục.</Text>
              <View style={styles.quotaRow}>
                <Text style={styles.quotaText}>
                  Còn {subscription?.remainingScans ?? 0}/{subscription?.dailyScanLimit ?? PLAN_DATA.free.scanLimit} lượt {currentTier === 'free' ? 'miễn phí ' : ''}hôm nay
                </Text>
                <Text style={styles.quotaPercent}>{progress}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>

            <View style={styles.segment}>
              <SegmentButton label="Theo tháng" active={billingCycle === 'monthly'} onPress={() => setBillingCycle('monthly')} />
              <SegmentButton label="Theo năm" active={billingCycle === 'yearly'} onPress={() => setBillingCycle('yearly')} />
            </View>

            <Text style={styles.sectionTitle}>Chọn gói phù hợp</Text>
            <FreePlanCard currentTier={currentTier} />
            <PaidPlanCard
              plan="personal"
              icon="leaf-outline"
              selected={selectedPlan === 'personal'}
              current={currentTier === 'personal' && Boolean(subscription?.expiresAt)}
              cycle={billingCycle}
              onPress={() => setSelectedPlan('personal')}
            />
            <PaidPlanCard
              plan="pro"
              icon="ribbon-outline"
              selected={selectedPlan === 'pro'}
              current={currentTier === 'pro' && Boolean(subscription?.expiresAt)}
              cycle={billingCycle}
              onPress={() => setSelectedPlan('pro')}
            />

            <View style={styles.paymentCard}>
              <View style={styles.paymentIcon}>
                <Ionicons name="card-outline" size={20} color={GREEN} />
              </View>
              <View style={styles.fill}>
                <Text style={styles.paymentTitle}>Thanh toán an toàn qua VNPAY</Text>
                <Text style={styles.paymentText}>Hỗ trợ thẻ ngân hàng, ví điện tử và mã QR.</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              disabled={paying || isSelectedCurrentPlan}
              onPress={startPayment}
              style={[styles.ctaButton, (paying || isSelectedCurrentPlan) && styles.ctaDisabled]}
            >
              <Text style={styles.ctaText}>
                {paying
                  ? 'Đang tạo thanh toán...'
                  : isSelectedCurrentPlan
                    ? `Đang dùng gói ${tierLabel(selectedPlan)}`
                    : `Nâng cấp gói ${selectedPlanData.title}`}
              </Text>
            </Pressable>
            <Text style={styles.footerNote}>Gói hết hạn có thể gia hạn bất cứ lúc nào.</Text>
          </View>
        </>
      )}
    </View>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FreePlanCard({ currentTier }: { currentTier: string }) {
  return (
    <View style={styles.freeCard}>
      <PlanHeader title="Miễn phí" price="0đ" />
      <FeatureList features={PLAN_DATA.free.features} />
      <View style={styles.currentPill}>
        <Text style={styles.currentPillText}>{currentTier === 'free' ? 'Đang dùng' : 'Gói mặc định'}</Text>
      </View>
    </View>
  );
}

function PaidPlanCard({
  plan,
  icon,
  selected,
  current,
  cycle,
  onPress,
}: {
  plan: PaidPlan;
  icon: IconName;
  selected: boolean;
  current: boolean;
  cycle: BillingCycle;
  onPress: () => void;
}) {
  const data = PLAN_DATA[plan];
  const price = cycle === 'yearly' ? data.yearlyPrice : data.monthlyPrice;
  return (
    <Pressable onPress={onPress} style={[styles.planCard, selected && styles.planCardSelected]}>
      <View style={styles.planTop}>
        <View style={[styles.planIcon, selected && styles.planIconSelected]}>
          <Ionicons name={icon} size={20} color={selected ? CARD : GREEN} />
        </View>
        <View style={styles.fill}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planTitle}>{data.title}</Text>
            {'badge' in data && <Text style={styles.popularBadge}>{data.badge}</Text>}
            {current && <Text style={styles.currentBadge}>Đang dùng</Text>}
          </View>
          <Text style={styles.planPrice}>{formatVnd(price)} <Text style={styles.priceSuffix}>/{cycle === 'yearly' ? 'năm' : 'tháng'}</Text></Text>
          {cycle === 'yearly' && <Text style={styles.savingText}>Tiết kiệm 2 tháng</Text>}
        </View>
      </View>
      <FeatureList features={data.features} />
      <View style={[styles.planButton, selected && styles.planButtonSelected]}>
        <Text style={[styles.planButtonText, selected && styles.planButtonTextSelected]}>
          {current ? 'Đang dùng' : plan === 'personal' ? 'Nâng cấp gói Cá nhân' : 'Chọn gói Pro'}
        </Text>
      </View>
    </Pressable>
  );
}

function PlanHeader({ title, price }: { title: string; price: string }) {
  return (
    <View style={styles.planHeader}>
      <Text style={styles.planTitle}>{title}</Text>
      <Text style={styles.planPrice}>{price}</Text>
    </View>
  );
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <View style={styles.featureList}>
      {features.map((feature) => (
        <View key={feature} style={styles.featureRow}>
          <Text style={styles.featureBullet}>·</Text>
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: DARK, fontSize: 18, lineHeight: 24, fontWeight: '900' },
  content: { padding: 18, paddingBottom: 128 },
  hero: {
    borderRadius: 8,
    backgroundColor: '#F4FBF0',
    borderWidth: 1,
    borderColor: '#D8EED2',
    padding: 16,
    marginBottom: 14,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { color: DARK, fontSize: 22, lineHeight: 28, fontWeight: '900' },
  heroText: { marginTop: 6, color: MUTED, fontSize: 13, lineHeight: 19 },
  quotaRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  quotaText: { flex: 1, color: DARK, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  quotaPercent: { color: GREEN, fontSize: 13, fontWeight: '900' },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#DDEBDA', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 4, backgroundColor: GREEN },
  segment: {
    height: 44,
    borderRadius: 8,
    padding: 4,
    backgroundColor: '#EEF5EC',
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    marginBottom: 16,
  },
  segmentButton: { flex: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: CARD },
  segmentText: { color: MUTED, fontSize: 13, fontWeight: '800' },
  segmentTextActive: { color: GREEN, fontWeight: '900' },
  sectionTitle: { color: DARK, fontSize: 17, lineHeight: 22, fontWeight: '900', marginBottom: 10 },
  freeCard: {
    borderRadius: 8,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  planCard: {
    borderRadius: 8,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  planCardSelected: { borderColor: GREEN, backgroundColor: '#F7FCF5' },
  planTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconSelected: { backgroundColor: GREEN },
  fill: { flex: 1, minWidth: 0 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  planTitle: { color: DARK, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EAF8EE',
    color: GREEN,
    fontSize: 10,
    fontWeight: '900',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EEF0F3',
    color: MUTED,
    fontSize: 10,
    fontWeight: '900',
  },
  planPrice: { color: DARK, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  priceSuffix: { color: MUTED, fontSize: 12, fontWeight: '700' },
  savingText: { marginTop: 2, color: '#D97300', fontSize: 11, fontWeight: '900' },
  featureList: { marginTop: 10, gap: 5 },
  featureRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  featureBullet: { color: GREEN, fontSize: 16, lineHeight: 18, fontWeight: '900' },
  featureText: { flex: 1, color: MUTED, fontSize: 12, lineHeight: 18 },
  currentPill: {
    marginTop: 12,
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: '#EEF0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPillText: { color: MUTED, fontSize: 12, fontWeight: '900' },
  planButton: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CDEBD4',
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planButtonSelected: { backgroundColor: GREEN, borderColor: GREEN },
  planButtonText: { color: GREEN, fontSize: 12, fontWeight: '900' },
  planButtonTextSelected: { color: CARD },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 13,
    marginTop: 6,
  },
  paymentIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: { color: DARK, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  paymentText: { marginTop: 2, color: MUTED, fontSize: 11, lineHeight: 15 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  ctaButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: '#A7B8AB' },
  ctaText: { color: CARD, fontSize: 15, fontWeight: '900' },
  footerNote: { marginTop: 8, color: MUTED, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 8, color: MUTED, fontSize: 13, textAlign: 'center' },
  errorText: { color: theme.colors.severe, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 12 },
  primaryButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: CARD, fontSize: 13, fontWeight: '900' },
});
