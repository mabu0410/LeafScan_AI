import { AdminDashboardData, AuthSession, CareTip, CareTipPayload, PartnerProduct, PartnerStore } from './types';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  DEFAULT_API_BASE_URL;

const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function requestJson<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

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
    throw new Error(response.message || 'Dang nhap that bai.');
  }

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
  if (!response.data) throw new Error(response.message || 'Khong tai duoc thong ke admin.');
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
  if (!response.data) throw new Error(response.message || 'Khong cap nhat duoc dai ly.');
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
  if (!response.data) throw new Error(response.message || 'Khong cap nhat duoc san pham.');
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
  if (!response.data) throw new Error(response.message || 'Khong tao duoc meo cham soc.');
  return response.data;
}

export async function updateCareTip(token: string, id: number, payload: CareTipPayload): Promise<CareTip> {
  const response = await requestJson<ApiEnvelope<CareTip>>(`/admin/care-tips/${id}`, {
    method: 'PUT',
    token,
    body: payload,
  });
  if (!response.data) throw new Error(response.message || 'Khong cap nhat duoc meo cham soc.');
  return response.data;
}

export async function deleteCareTip(token: string, id: number): Promise<void> {
  await requestJson<{ success: boolean; message?: string }>(`/admin/care-tips/${id}`, {
    method: 'DELETE',
    token,
  });
}
