import { API_BASE_URL, API_V1_URL } from './config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
}

const REQUEST_TIMEOUT_MS = 15000;

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body, headers } = options;
  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers || {}),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_V1_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Quá thời gian kết nối API (${REQUEST_TIMEOUT_MS / 1000}s). Kiểm tra backend tại ${API_BASE_URL}.`
      );
    }
    throw new Error(
      `Không kết nối được API tại ${API_BASE_URL}. Kiểm tra backend và EXPO_PUBLIC_API_BASE_URL.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const maybeJson = await tryParseJson(response);
  if (!response.ok) {
    const detail = (maybeJson as any)?.detail || `HTTP ${response.status}`;
    const error = new Error(typeof detail === 'string' ? detail : detail?.message || JSON.stringify(detail)) as Error & {
      status?: number;
      detail?: unknown;
    };
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return maybeJson as T;
}

async function tryParseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
