import { requestJson } from './client';
import { NotificationItem } from '../types';

export interface NotificationStatus {
  enabled: boolean;
  activeTokenCount: number;
  latestRegisteredAt?: string;
}

export interface NotificationSendResult {
  sent: number;
  failed: number;
}

export interface NotificationListResult {
  items: NotificationItem[];
  unreadCount: number;
}

function mapStatus(raw: any): NotificationStatus {
  return {
    enabled: Boolean(raw?.enabled),
    activeTokenCount: Number(raw?.active_token_count || 0),
    latestRegisteredAt: raw?.latest_registered_at || undefined,
  };
}

function mapNotification(raw: any): NotificationItem {
  return {
    id: String(raw.id),
    notificationType: raw.notification_type || 'system',
    title: raw.title || '',
    body: raw.body || '',
    data: raw.data || undefined,
    readAt: raw.read_at || undefined,
    createdAt: raw.created_at || '',
  };
}

export async function registerPushTokenApi(
  authToken: string,
  input: { token: string; platform?: string; deviceId?: string }
): Promise<NotificationStatus> {
  const response = await requestJson<any>('/notifications/register', {
    method: 'POST',
    token: authToken,
    body: {
      token: input.token,
      platform: input.platform,
      device_id: input.deviceId,
    },
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Không đăng ký được thông báo.');
  return mapStatus(response.data);
}

export async function unregisterPushTokenApi(authToken: string, expoPushToken?: string): Promise<NotificationStatus> {
  const response = await requestJson<any>('/notifications/unregister', {
    method: 'POST',
    token: authToken,
    body: { token: expoPushToken },
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Không tắt được thông báo.');
  return mapStatus(response.data);
}

export async function getNotificationStatusApi(authToken: string): Promise<NotificationStatus> {
  const response = await requestJson<any>('/notifications/status', { token: authToken });
  if (!response.success || !response.data) throw new Error(response.message || 'Không tải được trạng thái thông báo.');
  return mapStatus(response.data);
}

export async function sendTestNotificationApi(authToken: string): Promise<NotificationSendResult> {
  const response = await requestJson<any>('/notifications/test', {
    method: 'POST',
    token: authToken,
    body: {
      title: 'LeafScan AI',
      body: 'Thông báo thử từ LeafScan AI đã sẵn sàng.',
    },
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Không gửi được thông báo thử.');
  return {
    sent: Number(response.data.sent || 0),
    failed: Number(response.data.failed || 0),
  };
}

export async function listNotificationsApi(authToken: string): Promise<NotificationListResult> {
  const response = await requestJson<any>('/notifications', { token: authToken });
  if (!response.success || !response.data) throw new Error(response.message || 'Không tải được thông báo.');
  return {
    items: (response.data.items || []).map(mapNotification),
    unreadCount: Number(response.data.unread_count || 0),
  };
}

export async function markNotificationReadApi(authToken: string, notificationId: string): Promise<NotificationItem | null> {
  const response = await requestJson<any>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token: authToken,
  });
  if (!response.success) throw new Error(response.message || 'Không cập nhật được thông báo.');
  return response.data ? mapNotification(response.data) : null;
}

export async function markAllNotificationsReadApi(authToken: string): Promise<NotificationListResult> {
  const response = await requestJson<any>('/notifications/read-all', {
    method: 'PATCH',
    token: authToken,
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Không cập nhật được thông báo.');
  return {
    items: (response.data.items || []).map(mapNotification),
    unreadCount: Number(response.data.unread_count || 0),
  };
}
