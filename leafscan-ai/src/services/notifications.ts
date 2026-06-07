import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { registerPushTokenApi, unregisterPushTokenApi } from '../api/notifications';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
let notificationHandlerConfigured = false;

function isAndroidExpoGo(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

function loadNotificationsModule(): NotificationsModule {
  assertAndroidPushEnvironment(getProjectId());

  if (notificationsModule === null) {
    // Lazy-load to avoid Expo Go Android SDK 53+ remote-push warning at module import time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notificationsModule = require('expo-notifications') as NotificationsModule;
  }

  if (!notificationHandlerConfigured) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return notificationsModule;
}

function getProjectId(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants.expoConfig as any)?.extra?.projectId
  );
}

function assertAndroidPushEnvironment(projectId?: string) {
  if (Platform.OS !== 'android') return;

  if (isAndroidExpoGo()) {
    throw new Error(
      'Android push notifications không hỗ trợ trong Expo Go từ SDK 53. Hãy chạy development build hoặc production build.'
    );
  }

  if (!projectId) {
    throw new Error(
      'Thiếu EXPO_PUBLIC_EAS_PROJECT_ID. Lấy project id bằng `npx eas project:info` rồi thêm vào leafscan-ai/.env.'
    );
  }
}

async function ensureAndroidChannel(notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await notifications.setNotificationChannelAsync('default', {
    name: 'LeafScan reminders',
    importance: notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5C8B5A',
  });
}

async function getExpoPushToken(requestPermission: boolean): Promise<string> {
  const projectId = getProjectId();
  assertAndroidPushEnvironment(projectId);

  if (!Device.isDevice) {
    throw new Error('Push notification cần thiết bị thật hoặc development build.');
  }

  const notifications = loadNotificationsModule();
  await ensureAndroidChannel(notifications);

  const existing = await notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (existing.status !== 'granted' && requestPermission) {
    const requested = await notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Bạn chưa cấp quyền nhận thông báo.');
  }

  const tokenResult = projectId
    ? await notifications.getExpoPushTokenAsync({ projectId })
    : await notifications.getExpoPushTokenAsync();

  return tokenResult.data;
}

export async function registerForPushNotificationsAsync(
  authToken: string,
  options: { requestPermission?: boolean } = {}
): Promise<string> {
  const expoPushToken = await getExpoPushToken(options.requestPermission !== false);
  await registerPushTokenApi(authToken, {
    token: expoPushToken,
    platform: Platform.OS,
    deviceId: Constants.sessionId || Device.deviceName || undefined,
  });
  return expoPushToken;
}

export async function unregisterPushNotificationsAsync(authToken: string, expoPushToken?: string): Promise<void> {
  await unregisterPushTokenApi(authToken, expoPushToken);
}

export function usePushNotificationSync(authToken: string | null, enabled: boolean) {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (!authToken) return;

      try {
        if (enabled) {
          await registerForPushNotificationsAsync(authToken, { requestPermission: false });
          return;
        }
        await unregisterPushNotificationsAsync(authToken);
      } catch (error) {
        if (!cancelled && __DEV__) {
          console.info('[LeafScan Notifications] sync skipped:', error instanceof Error ? error.message : error);
        }
      }
    }

    sync().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [authToken, enabled]);
}
