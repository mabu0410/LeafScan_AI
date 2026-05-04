import { requestJson } from './client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
}

export interface AuthResult {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

function mapAuthData(payload: any): AuthResult {
  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type || 'bearer',
    user: {
      id: String(payload.user.id),
      name: payload.user.name,
      email: payload.user.email,
      phone: payload.user.phone || undefined,
      avatar: payload.user.avatar || undefined,
      createdAt: payload.user.created_at || undefined,
    },
  };
}

export async function loginApi(email: string, password: string): Promise<AuthResult> {
  const response = await requestJson<any>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Đăng nhập thất bại');
  }
  return mapAuthData(response.data);
}

export async function registerApi(name: string, email: string, password: string): Promise<AuthResult> {
  const response = await requestJson<any>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Đăng ký thất bại');
  }
  return mapAuthData(response.data);
}

export async function meApi(token: string): Promise<AuthUser> {
  const response = await requestJson<any>('/auth/me', { token });
  if (!response.success || !response.data?.user) {
    throw new Error(response.message || 'Không lấy được thông tin người dùng');
  }
  return {
    id: String(response.data.user.id),
    name: response.data.user.name,
    email: response.data.user.email,
    phone: response.data.user.phone || undefined,
    avatar: response.data.user.avatar || undefined,
    createdAt: response.data.user.created_at || undefined,
  };
}
