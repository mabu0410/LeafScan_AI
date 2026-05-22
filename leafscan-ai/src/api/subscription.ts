import { SubscriptionStatus, UserPaymentTransaction, UserPlanKey, UserSubscriptionTier } from '../types';
import { requestJson } from './client';

export interface UserPaymentCreateResult {
  txnRef: string;
  amountVnd: number;
  paymentUrl: string;
  status: string;
  planKey: UserPlanKey;
  tier: 'personal' | 'pro';
  durationDays: number;
  dailyScanLimit: number;
}

function mapSubscription(raw: any): SubscriptionStatus {
  return {
    tier: raw?.tier || 'free',
    remainingScans: Number(raw?.remaining_scans || 0),
    dailyScanLimit: Number(raw?.daily_scan_limit || 0),
    usedScansToday: Number(raw?.used_scans_today || 0),
    expiresAt: raw?.expires_at || undefined,
  };
}

function mapUserPayment(raw: any): UserPaymentTransaction {
  return {
    id: String(raw.id),
    userId: String(raw.user_id),
    provider: raw.provider || 'vnpay',
    txnRef: raw.txn_ref || '',
    planKey: raw.plan_key || '',
    tier: raw.tier || 'free',
    amountVnd: Number(raw.amount_vnd || 0),
    durationDays: Number(raw.duration_days || 0),
    dailyScanLimit: Number(raw.daily_scan_limit || 0),
    status: raw.status || 'pending',
    paymentUrl: raw.payment_url || undefined,
    vnpTransactionNo: raw.vnp_transaction_no || undefined,
    providerResponseCode: raw.provider_response_code || undefined,
    providerTransactionStatus: raw.provider_transaction_status || undefined,
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
    paidAt: raw.paid_at || undefined,
  };
}

export async function getSubscriptionStatusApi(token: string): Promise<SubscriptionStatus> {
  const response = await requestJson<any>('/subscription/status', { token });
  if (!response.success || !response.data) throw new Error(response.message || 'Không lấy được trạng thái gói.');
  return mapSubscription(response.data);
}

export async function createUserVnpayPaymentApi(token: string, planKey: UserPlanKey): Promise<UserPaymentCreateResult> {
  const response = await requestJson<any>('/user-payments/vnpay/create', {
    method: 'POST',
    token,
    body: { plan_key: planKey },
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Không tạo được thanh toán VNPAY.');
  return {
    txnRef: response.data.txn_ref,
    amountVnd: Number(response.data.amount_vnd || 0),
    paymentUrl: response.data.payment_url,
    status: response.data.status || 'pending',
    planKey: response.data.plan_key,
    tier: response.data.tier,
    durationDays: Number(response.data.duration_days || 0),
    dailyScanLimit: Number(response.data.daily_scan_limit || 0),
  };
}

export async function getUserPaymentStatusApi(token: string, txnRef: string): Promise<UserPaymentTransaction> {
  const response = await requestJson<any>(`/user-payments/status/${txnRef}`, { token });
  if (!response.success || !response.data) throw new Error(response.message || 'Không lấy được trạng thái thanh toán.');
  return mapUserPayment(response.data);
}
