import * as Google from 'expo-auth-session/providers/google';
import {
  AccessTokenRequest,
  AuthSessionResult,
  ResponseType,
  makeRedirectUri,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { requestJson } from './client';
import { toApiAssetUrl } from './config';

// Đảm bảo web browser session được đóng đúng cách
WebBrowser.maybeCompleteAuthSession();

// Google Client IDs — đọc từ .env (EXPO_PUBLIC_ prefix để Expo inject vào runtime)
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const MISSING_GOOGLE_CLIENT_ID = 'missing-google-client-id';
const GOOGLE_REDIRECT_SCHEME = 'leafscan';
const GOOGLE_REDIRECT_PATH = 'oauthredirect';
const ANDROID_PACKAGE_NAME = 'com.leafscan.ai';
let nativeGoogleConfigured = false;

type GoogleRequestForExchange = {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  codeVerifier?: string;
};

function getPlatformGoogleClientId() {
  if (Platform.OS === 'ios') return GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === 'android') return GOOGLE_ANDROID_CLIENT_ID;
  return GOOGLE_WEB_CLIENT_ID;
}

function isNativeClientConfigured(platformClientId: string) {
  if (!platformClientId) return false;
  if (GOOGLE_WEB_CLIENT_ID && platformClientId === GOOGLE_WEB_CLIENT_ID) return false;
  return platformClientId.endsWith('.apps.googleusercontent.com');
}

function getGoogleCloudProjectNumber(clientId: string) {
  const match = clientId.match(/^(\d+)-.+\.apps\.googleusercontent\.com$/);
  return match?.[1] || null;
}

function assertAndroidGoogleConfigMatches() {
  const webProject = getGoogleCloudProjectNumber(GOOGLE_WEB_CLIENT_ID);
  const androidProject = getGoogleCloudProjectNumber(GOOGLE_ANDROID_CLIENT_ID);

  if (webProject && androidProject && webProject !== androidProject) {
    throw new Error(
      `Google OAuth Android đang sai project: Web client ID thuộc project ${webProject}, ` +
        `Android client ID thuộc project ${androidProject}. Tạo/copy Android OAuth client trong cùng ` +
        `Google Cloud project với Web client ID, package ${ANDROID_PACKAGE_NAME}, đúng SHA-1 của APK đang cài, rồi rebuild app.`
    );
  }
}

export function useGoogleAuth() {
  const platformClientId = getPlatformGoogleClientId();
  const nativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
  const isConfigured = nativePlatform
    ? isNativeClientConfigured(platformClientId)
    : Boolean(GOOGLE_WEB_CLIENT_ID);
  const requestClientId = isConfigured
    ? platformClientId
    : GOOGLE_WEB_CLIENT_ID || platformClientId || MISSING_GOOGLE_CLIENT_ID;
  const redirectUri = nativePlatform
    ? makeRedirectUri({ scheme: GOOGLE_REDIRECT_SCHEME, path: GOOGLE_REDIRECT_PATH })
    : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: requestClientId,
    webClientId: GOOGLE_WEB_CLIENT_ID || requestClientId,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || requestClientId,
    iosClientId: GOOGLE_IOS_CLIENT_ID || requestClientId,
    redirectUri,
    responseType: Platform.OS === 'web' ? ResponseType.IdToken : undefined,
    shouldAutoExchangeCode: false,
    selectAccount: true,
  });

  return { request, response, promptAsync, isConfigured, redirectUri };
}

export function extractGoogleIdToken(response: AuthSessionResult | null | undefined) {
  if (!response || response.type !== 'success') return null;
  return (
    response.authentication?.idToken ||
    response.params.id_token ||
    response.params.idToken ||
    null
  );
}

function extractGoogleAuthCode(response: AuthSessionResult | null | undefined) {
  if (!response || response.type !== 'success') return null;
  return response.params.code || null;
}

export async function resolveGoogleIdToken(
  response: AuthSessionResult,
  request: GoogleRequestForExchange | null
) {
  const directToken = extractGoogleIdToken(response);
  if (directToken) return directToken;

  const code = extractGoogleAuthCode(response);
  if (!code) return null;
  if (!request?.clientId || !request.redirectUri || !request.codeVerifier) {
    throw new Error('Google OAuth request thiếu thông tin PKCE để đổi token.');
  }

  const tokenRequest = new AccessTokenRequest({
    clientId: request.clientId,
    redirectUri: request.redirectUri,
    code,
    scopes: request.scopes,
    extraParams: {
      code_verifier: request.codeVerifier,
    },
  });
  const tokenResponse = await tokenRequest.performAsync(Google.discovery);
  return tokenResponse.idToken || null;
}

export function getGoogleAuthErrorMessage(response: AuthSessionResult | null | undefined) {
  if (!response) return null;
  if (response.type === 'cancel' || response.type === 'dismiss') return null;
  if (response.type === 'error') {
    return (
      response.params.error_description ||
      response.error?.message ||
      response.params.error ||
      'Google OAuth trả về lỗi.'
    );
  }
  if (response.type === 'locked') return 'Đang có phiên đăng nhập Google khác, hãy thử lại.';
  if (response.type === 'opened') return 'Google OAuth chưa hoàn tất.';
  return 'Google không trả ID token. Kiểm tra Android OAuth client ID, SHA-1 và redirect URI.';
}

export function getGoogleAuthDebugInfo(response: AuthSessionResult | null | undefined) {
  if (!response) return { type: 'null' };
  if (response.type !== 'success' && response.type !== 'error') {
    return { type: response.type };
  }
  return {
    type: response.type,
    paramKeys: Object.keys(response.params || {}),
    hasCode: Boolean(response.params?.code),
    hasIdToken: Boolean(extractGoogleIdToken(response)),
    hasAuthentication: Boolean(response.authentication),
    error: response.error?.message || response.params?.error || null,
  };
}

export async function signInWithNativeGoogle() {
  if (Platform.OS !== 'android') {
    throw new Error('Google native sign-in hiện chỉ bật cho Android.');
  }
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Thiếu EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID để lấy Google ID token.');
  }
  if (!GOOGLE_ANDROID_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID === GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Thiếu Android Google OAuth client ID hợp lệ.');
  }
  assertAndroidGoogleConfigMatches();

  const {
    GoogleSignin,
    isCancelledResponse,
    isErrorWithCode,
    statusCodes,
  } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');

  if (!nativeGoogleConfigured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      offlineAccess: false,
    });
    nativeGoogleConfigured = true;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;

    const idToken = response.data.idToken || (await GoogleSignin.getTokens()).idToken;
    if (!idToken) {
      throw new Error('Google native sign-in không trả ID token. Kiểm tra Web client ID.');
    }
    return idToken;
  } catch (error: any) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Thiết bị thiếu hoặc cần cập nhật Google Play Services.');
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Đang có phiên đăng nhập Google khác.');
      }
      if (error.code === 'DEVELOPER_ERROR') {
        throw new Error(
          `Google Cloud cấu hình chưa khớp: Web client ID và Android OAuth client phải cùng project, Android client phải có package ${ANDROID_PACKAGE_NAME} và đúng SHA-1 của APK đang cài.`
        );
      }
    }
    throw error;
  }
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
      avatar: toApiAssetUrl(response.data.user.avatar as string),
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
