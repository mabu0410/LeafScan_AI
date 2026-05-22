import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { requestJson } from './client';

// Đảm bảo web browser session được đóng đúng cách
WebBrowser.maybeCompleteAuthSession();

// Google Client IDs — đọc từ .env (EXPO_PUBLIC_ prefix để Expo inject vào runtime)
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

function getPlatformGoogleClientId() {
  if (Platform.OS === 'ios') return GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === 'android') return GOOGLE_ANDROID_CLIENT_ID;
  return GOOGLE_WEB_CLIENT_ID;
}

export function useGoogleAuth() {
  const platformClientId = getPlatformGoogleClientId();
  const fallbackClientId = platformClientId || GOOGLE_WEB_CLIENT_ID || 'missing-google-client-id';
  const isConfigured = fallbackClientId !== 'missing-google-client-id';

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: fallbackClientId,
    webClientId: GOOGLE_WEB_CLIENT_ID || fallbackClientId,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || fallbackClientId,
    iosClientId: GOOGLE_IOS_CLIENT_ID || fallbackClientId,
  });

  return { request, response, promptAsync, isConfigured };
}

/**
 * Đăng nhập bằng Google ID token.
 */
export async function googleLoginApi(idToken: string) {
  const response = await requestJson<any>('/auth/google/login', {
    method: 'POST',
    body: { id_token: idToken },
  });
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Đăng nhập Google thất bại');
  }
  return {
    accessToken: response.data.access_token as string,
    tokenType: response.data.token_type as string,
    user: {
      id: String(response.data.user.id),
      name: response.data.user.name as string,
      email: response.data.user.email as string,
      phone: (response.data.user.phone as string) || undefined,
      avatar: (response.data.user.avatar as string) || undefined,
      role: (response.data.user.role as string) || 'farmer',
      createdAt: (response.data.user.created_at as string) || undefined,
    },
  };
}

/**
 * Liên kết tài khoản hiện tại với Google.
 */
export async function googleLinkApi(token: string, idToken: string) {
  const response = await requestJson<any>('/auth/google/link', {
    method: 'POST',
    token,
    body: { id_token: idToken },
  });
  if (!response.success) {
    throw new Error(response.message || 'Liên kết Google thất bại');
  }
  return response;
}

/**
 * Hủy liên kết Google.
 */
export async function googleUnlinkApi(token: string) {
  const response = await requestJson<any>('/auth/google/unlink', {
    method: 'POST',
    token,
  });
  if (!response.success) {
    throw new Error(response.message || 'Hủy liên kết Google thất bại');
  }
  return response;
}
