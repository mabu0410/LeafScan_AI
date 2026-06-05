import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getPaymentStatusApi } from '../api/marketplace';
import { getUserPaymentStatusApi } from '../api/subscription';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

type Route = RouteProp<RootStackParamList, 'PaymentResult'>;
type Navigation = StackNavigationProp<RootStackParamList>;
type PaymentType = 'user' | 'partner';
type UiStatus = 'checking' | 'success' | 'failed' | 'pending';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const GREEN = '#007C39';
const DARK = '#171326';
const BG = '#FFFDF8';
const CARD = '#FFFFFF';
const BORDER = '#E3EBDD';
const MUTED = '#6F7180';
const WARNING = '#D97300';

function inferPaymentType(paymentType?: string, txnRef?: string): PaymentType {
  if (paymentType === 'partner' || txnRef?.startsWith('PARTNER')) return 'partner';
  return 'user';
}

function initialUiStatus(status?: string, responseCode?: string, transactionStatus?: string): UiStatus {
  if (status === 'failed') return 'failed';
  if (hasFailedGatewayReturn(responseCode, transactionStatus)) return 'failed';
  if (status === 'success' || responseCode === '00') return 'checking';
  return 'pending';
}

function mapTransactionStatus(status?: string): UiStatus {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'failed';
  return 'pending';
}

function hasFailedGatewayReturn(responseCode?: string, transactionStatus?: string): boolean {
  return Boolean(
    (responseCode && responseCode !== '00') || (transactionStatus && transactionStatus !== '00')
  );
}

function statusConfig(status: UiStatus): {
  title: string;
  body: string;
  icon: IconName;
  color: string;
  background: string;
} {
  if (status === 'success') {
    return {
      title: 'Thanh toán thành công',
      body: 'Gói của bạn đã được kích hoạt. Bạn có thể quay lại ứng dụng để tiếp tục sử dụng.',
      icon: 'checkmark-circle',
      color: GREEN,
      background: '#EAF8EE',
    };
  }
  if (status === 'failed') {
    return {
      title: 'Thanh toán thất bại',
      body: 'Giao dịch chưa hoàn tất hoặc đã bị hủy. Bạn có thể thử thanh toán lại.',
      icon: 'close-circle',
      color: theme.colors.severe,
      background: '#FDECEC',
    };
  }
  if (status === 'pending') {
    return {
      title: 'Đang chờ xác nhận',
      body: 'VNPAY đã trả kết quả về app, nhưng server chưa xác nhận xong. Vui lòng kiểm tra lại sau vài giây.',
      icon: 'time',
      color: WARNING,
      background: '#FFF3DF',
    };
  }
  return {
    title: 'Đang kiểm tra thanh toán',
    body: 'Ứng dụng đang kiểm tra trạng thái giao dịch từ server.',
    icon: 'sync-circle',
    color: GREEN,
    background: '#EAF8EE',
  };
}

export default function PaymentResultScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const token = useAuthStore((state) => state.accessToken);
  const params = route.params ?? {};
  const paymentType = useMemo(
    () => inferPaymentType(params.paymentType, params.txnRef),
    [params.paymentType, params.txnRef]
  );
  const [uiStatus, setUiStatus] = useState<UiStatus>(() =>
    initialUiStatus(params.status, params.responseCode, params.transactionStatus)
  );
  const [checking, setChecking] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(params.status || 'pending');
  const [responseCode, setResponseCode] = useState(params.responseCode || '');
  const [transactionNo, setTransactionNo] = useState(params.transactionNo || '');
  const [detail, setDetail] = useState<string | null>(null);

  const txnRef = params.txnRef || '';
  const config = statusConfig(uiStatus);

  const checkStatus = useCallback(async (): Promise<UiStatus> => {
    if (!txnRef) {
      setUiStatus('failed');
      setDetail('Không có mã giao dịch để kiểm tra.');
      return 'failed';
    }
    if (!token) {
      setUiStatus('pending');
      setDetail('Bạn cần đăng nhập lại để kiểm tra trạng thái giao dịch.');
      return 'pending';
    }

    setChecking(true);
    try {
      const tx =
        paymentType === 'partner'
          ? await getPaymentStatusApi(token, txnRef)
          : await getUserPaymentStatusApi(token, txnRef);
      let nextStatus = mapTransactionStatus(tx.status);
      if (nextStatus === 'pending' && hasFailedGatewayReturn(params.responseCode, params.transactionStatus)) {
        nextStatus = 'failed';
      }
      setTransactionStatus(tx.status || 'pending');
      setResponseCode(tx.providerResponseCode || params.responseCode || '');
      setTransactionNo(tx.vnpTransactionNo || params.transactionNo || '');
      setUiStatus(nextStatus);
      if (nextStatus === 'success') {
        setDetail(
          paymentType === 'partner'
            ? 'Gói đại lý đã được kích hoạt. Bạn có thể quản lý sản phẩm trong kênh đối tác.'
            : 'Gói quét AI đã được kích hoạt. Hạn mức quét sẽ được cập nhật trong tài khoản.'
        );
      } else if (nextStatus === 'failed') {
        setDetail('VNPAY hoặc server đã ghi nhận giao dịch không thành công.');
      } else {
        setDetail('Server đang chờ IPN từ VNPAY. Hãy kiểm tra lại sau vài giây.');
      }
      return nextStatus;
    } catch (err: any) {
      const nextStatus = params.responseCode === '00' ? 'pending' : 'failed';
      setUiStatus(nextStatus);
      setDetail(err?.message || 'Không kiểm tra được trạng thái giao dịch.');
      return nextStatus;
    } finally {
      setChecking(false);
    }
  }, [paymentType, params.responseCode, params.transactionNo, params.transactionStatus, token, txnRef]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async (remaining: number) => {
      const nextStatus = await checkStatus();
      if (cancelled) return;
      if ((nextStatus === 'checking' || nextStatus === 'pending') && remaining > 0) {
        timer = setTimeout(() => {
          run(remaining - 1).catch(() => undefined);
        }, 3000);
      }
    };

    run(4).catch(() => undefined);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [checkStatus]);

  const goBackToContext = () => {
    if (paymentType === 'partner') {
      navigation.navigate('PartnerChannel');
      return;
    }
    navigation.navigate('UpgradePlan');
  };

  const goHome = () => {
    (navigation as any).navigate('MainTabs', { screen: 'Home' });
  };

  const primaryLabel =
    uiStatus === 'success'
      ? paymentType === 'partner'
        ? 'Quay lại kênh đối tác'
        : 'Xem gói của tôi'
      : uiStatus === 'failed'
        ? 'Thử lại thanh toán'
        : 'Kiểm tra lại';

  const primaryAction =
    uiStatus === 'pending' || uiStatus === 'checking'
      ? () => {
          checkStatus().catch(() => undefined);
        }
      : goBackToContext;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goBackToContext} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>Kết quả thanh toán</Text>
        <Pressable onPress={() => checkStatus().catch(() => undefined)} style={styles.iconButton}>
          <Ionicons name="refresh-outline" size={19} color={DARK} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusIcon, { backgroundColor: config.background }]}>
          {checking && uiStatus !== 'success' && uiStatus !== 'failed' ? (
            <ActivityIndicator color={config.color} />
          ) : (
            <Ionicons name={config.icon} size={52} color={config.color} />
          )}
        </View>

        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.body}>{detail || config.body}</Text>

        <View style={styles.summary}>
          <SummaryRow label="Loại giao dịch" value={paymentType === 'partner' ? 'Gói đại lý' : 'Gói người dùng'} />
          <SummaryRow label="Mã giao dịch" value={txnRef || 'Không có'} />
          <SummaryRow label="Trạng thái server" value={transactionStatus || 'pending'} />
          <SummaryRow label="Mã phản hồi VNPAY" value={responseCode || 'Chưa có'} />
          {!!transactionNo && <SummaryRow label="Mã giao dịch VNPAY" value={transactionNo} />}
        </View>

        <Pressable disabled={checking} onPress={primaryAction} style={[styles.primaryButton, checking && styles.disabledButton]}>
          <Text style={styles.primaryButtonText}>{checking ? 'Đang kiểm tra...' : primaryLabel}</Text>
        </Pressable>
        <Pressable onPress={goHome} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
  },
  statusIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: { color: DARK, fontSize: 26, lineHeight: 32, fontWeight: '900', textAlign: 'center' },
  body: { marginTop: 10, color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  summary: {
    alignSelf: 'stretch',
    marginTop: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    padding: 14,
  },
  summaryRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  summaryLabel: { flex: 1, color: MUTED, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  summaryValue: {
    flex: 1.2,
    color: DARK,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
    textAlign: 'right',
  },
  primaryButton: {
    alignSelf: 'stretch',
    marginTop: 24,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { backgroundColor: '#A7B8AB' },
  primaryButtonText: { color: CARD, fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    alignSelf: 'stretch',
    marginTop: 10,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: DARK, fontSize: 14, fontWeight: '900' },
});
