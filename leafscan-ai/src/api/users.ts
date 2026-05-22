import { AuthUser, meApi } from './auth';
import { requestJson } from './client';

export interface UpdateUserProfilePayload {
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
}

function normalizeUser(raw: any): AuthUser {
  return {
    id: String(raw.id),
    name: raw.name || '',
    email: raw.email || '',
    phone: raw.phone || undefined,
    avatar: raw.avatar || undefined,
    role: raw.role || 'farmer',
    createdAt: raw.created_at || raw.createdAt || undefined,
  };
}

function extractUserPayload(response: any) {
  if (response?.data?.user) return response.data.user;
  if (response?.user) return response.user;
  if (response?.data && response?.data?.id) return response.data;
  if (response?.id) return response;
  return null;
}

export async function getCurrentUserApi(token: string): Promise<AuthUser> {
  try {
    const response = await requestJson<any>('/users/me', { token });
    const payload = extractUserPayload(response);
    if (!payload) {
      throw new Error('Không lấy được thông tin người dùng');
    }
    return normalizeUser(payload);
  } catch (error) {
    return meApi(token);
  }
}

export async function updateCurrentUserApi(
  token: string,
  payload: UpdateUserProfilePayload
): Promise<AuthUser> {
  const response = await requestJson<any>('/users/me', {
    method: 'PUT',
    token,
    body: payload,
  });

  const userPayload = extractUserPayload(response);
  if (!userPayload) {
    throw new Error('Cập nhật hồ sơ thất bại');
  }

  return normalizeUser(userPayload);
}
