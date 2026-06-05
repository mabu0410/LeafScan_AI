import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { NotificationItem, RootStackParamList } from '../types';
import { listNotificationsApi, markAllNotificationsReadApi, markNotificationReadApi } from '../api/notifications';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

type Nav = StackNavigationProp<RootStackParamList>;

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function typeLabel(value: string) {
  const labels: Record<string, string> = {
    partner_review: 'Duyệt đại lý',
    product_review: 'Duyệt sản phẩm',
    payment: 'Thanh toán',
    care_task: 'Lịch chăm sóc',
    system: 'Hệ thống',
  };
  return labels[value] || value;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((state) => state.accessToken);
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listNotificationsApi(token);
      setRows(data.items);
      setUnreadCount(data.unreadCount);
    } catch (error: any) {
      Alert.alert('Không tải được thông báo', error?.message || 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const markRead = async (item: NotificationItem) => {
    if (!token) return;
    try {
      await markNotificationReadApi(token, item.id);
      await load();
    } catch (error: any) {
      Alert.alert('Không cập nhật được thông báo', error?.message || 'Vui lòng thử lại.');
    }
  };

  const markAll = async () => {
    if (!token) return;
    try {
      const data = await markAllNotificationsReadApi(token);
      setRows(data.items);
      setUnreadCount(data.unreadCount);
    } catch (error: any) {
      Alert.alert('Không cập nhật được thông báo', error?.message || 'Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Thông báo</Text>
          <Text style={styles.subtitle}>{unreadCount} chưa đọc</Text>
        </View>
        <Pressable onPress={markAll} disabled={!unreadCount || loading} style={styles.iconButton}>
          <Ionicons name="checkmark-done-outline" size={21} color={unreadCount ? theme.colors.primary : theme.colors.textMuted} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>Đang tải thông báo...</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={44} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
          <Text style={styles.stateText}>Thông báo hệ thống và nhắc việc sẽ xuất hiện tại đây.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {rows.map((item) => (
            <Pressable key={item.id} onPress={() => markRead(item)} style={[styles.card, !item.readAt && styles.unreadCard]}>
              <View style={styles.cardIcon}>
                <Ionicons name={item.readAt ? 'notifications-outline' : 'notifications'} size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
                  {!item.readAt && <View style={styles.dot} />}
                </View>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.meta}>{typeLabel(item.notificationType)} · {formatDate(item.createdAt)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border },
  titleBox: { flex: 1 },
  title: { color: theme.colors.textPrimary, fontSize: 21, fontWeight: '900' },
  subtitle: { marginTop: 2, color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 8, color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center' },
  emptyTitle: { marginTop: 10, color: theme.colors.textPrimary, fontSize: 18, fontWeight: '900' },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bgCard },
  unreadCard: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryPale },
  cardIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgCard },
  cardBody: { flex: 1, minWidth: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: theme.colors.textPrimary, fontSize: 15, fontWeight: '900' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.primary },
  body: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  meta: { marginTop: 8, color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
});
