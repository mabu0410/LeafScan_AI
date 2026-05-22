import { NativeModules, Platform } from 'react-native';

const LOCALHOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/;
const AUTO_VALUES = new Set(['auto', 'lan']);

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

function getMetroHost(): string | undefined {
  const sourceCode = NativeModules.SourceCode as { scriptURL?: string } | undefined;
  const scriptURL = sourceCode?.scriptURL;
  if (typeof scriptURL !== 'string') return undefined;

  const match = scriptURL.match(/^https?:\/\/([^/:]+)/i);
  return match?.[1];
}

function inferApiBaseUrl(): string {
  const metroHost = getMetroHost();
  if (metroHost && !LOCALHOST_PATTERN.test(metroHost)) {
    return `http://${metroHost}:8000`;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const shouldInferApiBaseUrl =
  !configuredApiBaseUrl || AUTO_VALUES.has(configuredApiBaseUrl.toLowerCase());

export const API_BASE_URL = normalizeApiBaseUrl(
  shouldInferApiBaseUrl ? inferApiBaseUrl() : configuredApiBaseUrl
);
export const API_V1_URL = `${API_BASE_URL}/api/v1`;

export function toApiAssetUrl(value?: string | null): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL}${trimmed}`;
  }

  if (/^https?:\/\/[^/]+\/uploads(?:\/|$)/i.test(trimmed)) {
    const path = trimmed.replace(/^https?:\/\/[^/]+/i, '');
    return `${API_BASE_URL}${path}`;
  }

  return trimmed;
}

if (__DEV__) {
  console.info(`[LeafScan API] API_BASE_URL=${API_BASE_URL}`);
}
