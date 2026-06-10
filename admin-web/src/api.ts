import {
  AdminDashboardData,
  AdminDiseaseItem,
  AdminDiseasePayload,
  AdminPaymentItem,
  AdminRevenueReportData,
  AdminScanFeedbackItem,
  AdminScanItem,
  AdminUserItem,
  AuthSession,
  CareTip,
  CareTipPayload,
  MarketplaceInquiry,
  NotificationItem,
  NotificationListData,
  PaginatedData,
  PartnerProduct,
  PartnerStore,
} from './types';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

function normalizeApiBaseUrl(value: string) {
  const clean = value.trim().replace(/\/+$/, '');
  return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
}

const configuredApiDomain = import.meta.env.VITE_API_DOMAIN as string | undefined;
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = normalizeApiBaseUrl(configuredApiDomain || configuredApiBaseUrl || DEFAULT_API_BASE_URL);

const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function requestJson<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Failed to fetch' || message.toLowerCase().includes('fetch')) {
      throw new Error('Không kết nối được backend. Vui lòng kiểm tra API server.');
    }
    throw error;
  }

  const rawText = await response.text();
  const payload = rawText ? JSON.parse(rawText) : {};

  if (!response.ok) {
    const detail = payload?.detail || payload?.message || `HTTP ${response.status}`;
    const error = new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(', ') : String(detail));
    if (response.status === 401 || response.status === 403) {
      error.name = 'AuthError';
    }
    throw error;
  }

  return payload as T;
}

export function toAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${PUBLIC_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function loginAdmin(email: string, password: string): Promise<AuthSession> {
  const response = await requestJson<ApiEnvelope<any>>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const data = response.data;
  if (!response.success || !data?.access_token || !data?.user) {
    throw new Error(response.message || 'Đăng nhập thất bại.');
  }

  await requestJson<ApiEnvelope<AdminDashboardData>>('/admin/dashboard', { token: data.access_token });

  return {
    accessToken: data.access_token,
    user: {
      id: String(data.user.id),
      name: data.user.name || data.user.email || 'Admin',
      email: data.user.email || email,
      role: data.user.role || 'admin',
    },
  };
}

export async function listPendingPartners(token: string): Promise<PartnerStore[]> {
  const response = await requestJson<ApiEnvelope<PartnerStore[]>>('/admin/partners?status=pending_review', { token });
  return response.data || [];
}

export async function getAdminDashboard(token: string): Promise<AdminDashboardData> {
  const response = await requestJson<ApiEnvelope<AdminDashboardData>>('/admin/dashboard', { token });
  if (!response.data) throw new Error(response.message || 'Không tải được thống kê admin.');
  return response.data;
}

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== '') {
      query.set(key, String(value));
    }
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

export async function listAdminUsers(
  token: string,
  params: { q?: string; role?: string; status?: string; page?: number; pageSize?: number } = {}
): Promise<PaginatedData<AdminUserItem>> {
  const response = await requestJson<ApiEnvelope<PaginatedData<AdminUserItem>>>(
    `/admin/users${queryString({
      q: params.q,
      role: params.role === 'all' ? undefined : params.role,
      status: params.status === 'all' ? undefined : params.status,
      page: params.page,
      page_size: params.pageSize,
    })}`,
    { token }
  );
  if (!response.data) throw new Error(response.message || 'Không tải được người dùng.');
  return response.data;
}

export async function updateAdminUserStatus(token: string, userId: number, status: 'active' | 'suspended'): Promise<AdminUserItem> {
  const response = await requestJson<ApiEnvelope<AdminUserItem>>(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
  if (!response.data) throw new Error(response.message || 'Không cập nhật được người dùng.');
  return response.data;
}

export async function listAdminPayments(
  token: string,
  params: { q?: string; kind?: string; status?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number } = {}
): Promise<PaginatedData<AdminPaymentItem>> {
  const response = await requestJson<ApiEnvelope<PaginatedData<AdminPaymentItem>>>(
    `/admin/payments${queryString({
      q: params.q,
      kind: params.kind === 'all' ? undefined : params.kind,
      status: params.status === 'all' ? undefined : params.status,
      start_date: params.startDate,
      end_date: params.endDate,
      page: params.page,
      page_size: params.pageSize,
    })}`,
    { token }
  );
  if (!response.data) throw new Error(response.message || 'Không tải được thanh toán.');
  return response.data;
}

export async function getAdminRevenueReport(
  token: string,
  params: { startDate?: string; endDate?: string; period?: string; kind?: string; partnerId?: number | null } = {}
): Promise<AdminRevenueReportData> {
  const response = await requestJson<ApiEnvelope<AdminRevenueReportData>>(
    `/admin/revenue-report${queryString({
      start_date: params.startDate,
      end_date: params.endDate,
      period: params.period,
      kind: params.kind === 'all' ? undefined : params.kind,
      partner_id: params.partnerId || undefined,
    })}`,
    { token }
  );
  if (!response.data) throw new Error(response.message || 'Không tải được báo cáo doanh thu.');
  return response.data;
}

export async function exportAdminRevenueReport(
  token: string,
  params: { format: 'excel' | 'pdf'; startDate?: string; endDate?: string; period?: string; kind?: string; partnerId?: number | null }
): Promise<void> {
  const query = queryString({
    format: params.format,
    start_date: params.startDate,
    end_date: params.endDate,
    period: params.period,
    kind: params.kind === 'all' ? undefined : params.kind,
    partner_id: params.partnerId || undefined,
  });
  const response = await fetch(`${API_BASE_URL}/admin/revenue-report/export${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || payload?.message || 'Không xuất được báo cáo doanh thu.');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `leafscan-revenue.${params.format === 'pdf' ? 'pdf' : 'csv'}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function refundAdminPayment(token: string, payment: Pick<AdminPaymentItem, 'id' | 'kind'>, reason?: string): Promise<AdminPaymentItem> {
  const response = await requestJson<ApiEnvelope<AdminPaymentItem>>(`/admin/payments/${payment.kind}/${payment.id}/refund`, {
    method: 'POST',
    token,
    body: { reason },
  });
  if (!response.data) throw new Error(response.message || 'Không hoàn tiền được giao dịch.');
  return response.data;
}

export async function listAdminScans(
  token: string,
  params: { q?: string; severity?: string; page?: number; pageSize?: number } = {}
): Promise<PaginatedData<AdminScanItem>> {
  const response = await requestJson<ApiEnvelope<PaginatedData<AdminScanItem>>>(
    `/admin/scans${queryString({
      q: params.q,
      severity: params.severity === 'all' ? undefined : params.severity,
      page: params.page,
      page_size: params.pageSize,
    })}`,
    { token }
  );
  if (!response.data) throw new Error(response.message || 'Không tải được lịch sử quét.');
  return response.data;
}

export async function listAdminScanFeedback(
  token: string,
  params: { q?: string; feedback?: string; page?: number; pageSize?: number } = {}
): Promise<PaginatedData<AdminScanFeedbackItem>> {
  const response = await requestJson<ApiEnvelope<PaginatedData<AdminScanFeedbackItem>>>(
    `/admin/scan-feedback${queryString({
      q: params.q,
      feedback: params.feedback === 'all' ? undefined : params.feedback,
      page: params.page,
      page_size: params.pageSize,
    })}`,
    { token }
  );
  if (!response.data) throw new Error(response.message || 'Không tải được phản hồi quét.');
  return response.data;
}

export async function listAdminDiseases(token: string, params: { q?: string } = {}): Promise<AdminDiseaseItem[]> {
  const response = await requestJson<ApiEnvelope<AdminDiseaseItem[]>>(
    `/admin/diseases${queryString({ q: params.q })}`,
    { token }
  );
  return response.data || [];
}

export async function createAdminDisease(token: string, payload: AdminDiseasePayload): Promise<AdminDiseaseItem> {
  const response = await requestJson<ApiEnvelope<AdminDiseaseItem>>('/admin/diseases', {
    method: 'POST',
    token,
    body: payload,
  });
  if (!response.data) throw new Error(response.message || 'Không tạo được bệnh cây.');
  return response.data;
}

export async function updateAdminDisease(token: string, id: number, payload: AdminDiseasePayload): Promise<AdminDiseaseItem> {
  const response = await requestJson<ApiEnvelope<AdminDiseaseItem>>(`/admin/diseases/${id}`, {
    method: 'PUT',
    token,
    body: payload,
  });
  if (!response.data) throw new Error(response.message || 'Không cập nhật được bệnh cây.');
  return response.data;
}

export async function deleteAdminDisease(token: string, id: number): Promise<void> {
  await requestJson<{ success: boolean; message?: string }>(`/admin/diseases/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function listAdminInquiries(token: string, status?: string): Promise<MarketplaceInquiry[]> {
  const response = await requestJson<ApiEnvelope<MarketplaceInquiry[]>>(
    `/admin/inquiries${queryString({ status: status === 'all' ? undefined : status })}`,
    { token }
  );
  return response.data || [];
}

export async function listNotifications(token: string): Promise<NotificationListData> {
  const response = await requestJson<ApiEnvelope<NotificationListData>>('/notifications', { token });
  if (!response.data) throw new Error(response.message || 'Không tải được thông báo.');
  return response.data;
}

export async function markNotificationRead(token: string, id: number): Promise<NotificationItem | null> {
  const response = await requestJson<ApiEnvelope<NotificationItem | null>>(`/notifications/${id}/read`, {
    method: 'PATCH',
    token,
  });
  return response.data || null;
}

export async function markAllNotificationsRead(token: string): Promise<NotificationListData> {
  const response = await requestJson<ApiEnvelope<NotificationListData>>('/notifications/read-all', {
    method: 'PATCH',
    token,
  });
  if (!response.data) throw new Error(response.message || 'Không cập nhật được thông báo.');
  return response.data;
}

export async function updatePartnerStatus(
  token: string,
  id: number,
  status: 'active' | 'rejected'
): Promise<PartnerStore> {
  const response = await requestJson<ApiEnvelope<PartnerStore>>(`/admin/partners/${id}/status`, {
    method: 'PATCH',
    token,
    body: {
      status,
      rejection_reason: status === 'rejected' ? 'Hồ sơ chưa đạt yêu cầu.' : undefined,
    },
  });
  if (!response.data) throw new Error(response.message || 'Không cập nhật được đại lý.');
  return response.data;
}

export async function listPendingProducts(token: string): Promise<PartnerProduct[]> {
  const response = await requestJson<ApiEnvelope<PartnerProduct[]>>('/admin/products?status=pending_review', { token });
  return response.data || [];
}

export async function updateProductStatus(
  token: string,
  id: number,
  status: 'approved' | 'rejected'
): Promise<PartnerProduct> {
  const response = await requestJson<ApiEnvelope<PartnerProduct>>(`/admin/products/${id}/status`, {
    method: 'PATCH',
    token,
    body: {
      status,
      rejection_reason: status === 'rejected' ? 'Sản phẩm chưa đạt yêu cầu hiển thị.' : undefined,
    },
  });
  if (!response.data) throw new Error(response.message || 'Không cập nhật được sản phẩm.');
  return response.data;
}

export async function listAdminCareTips(token: string): Promise<CareTip[]> {
  const response = await requestJson<ApiEnvelope<CareTip[]>>('/admin/care-tips', { token });
  return response.data || [];
}

export async function createCareTip(token: string, payload: CareTipPayload): Promise<CareTip> {
  const response = await requestJson<ApiEnvelope<CareTip>>('/admin/care-tips', {
    method: 'POST',
    token,
    body: payload,
  });
  if (!response.data) throw new Error(response.message || 'Không tạo được mẹo chăm sóc.');
  return response.data;
}

export async function updateCareTip(token: string, id: number, payload: CareTipPayload): Promise<CareTip> {
  const response = await requestJson<ApiEnvelope<CareTip>>(`/admin/care-tips/${id}`, {
    method: 'PUT',
    token,
    body: payload,
  });
  if (!response.data) throw new Error(response.message || 'Không cập nhật được mẹo chăm sóc.');
  return response.data;
}

export async function deleteCareTip(token: string, id: number): Promise<void> {
  await requestJson<{ success: boolean; message?: string }>(`/admin/care-tips/${id}`, {
    method: 'DELETE',
    token,
  });
}
