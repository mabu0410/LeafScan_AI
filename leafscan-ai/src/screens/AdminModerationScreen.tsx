import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PartnerProduct, PartnerStore, RootStackParamList } from '../types';
import {
  adminListPartnersApi,
  adminListProductsApi,
  adminUpdatePartnerStatusApi,
  adminUpdateProductStatusApi,
} from '../api/marketplace';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

export default function AdminModerationScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const token = useAuthStore((state) => state.accessToken);
  const [partners, setPartners] = useState<PartnerStore[]>([]);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [nextPartners, nextProducts] = await Promise.all([
        adminListPartnersApi(token),
        adminListProductsApi(token),
      ]);
      setPartners(nextPartners);
      setProducts(nextProducts);
    } catch (err: any) {
      setError(err?.message || 'Không tải được dữ liệu duyệt.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const approvePartner = async (partner: PartnerStore, status: 'active' | 'rejected') => {
    if (!token) return;
    setSaving(true);
    try {
      await adminUpdatePartnerStatusApi(token, partner.id, status, status === 'rejected' ? 'Hồ sơ chưa đạt yêu cầu.' : undefined);
      await loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không cập nhật được đại lý.');
    } finally {
      setSaving(false);
    }
  };

  const approveProduct = async (product: PartnerProduct, status: 'approved' | 'rejected') => {
    if (!token) return;
    setSaving(true);
    try {
      await adminUpdateProductStatusApi(token, product.id, status, status === 'rejected' ? 'Sản phẩm chưa đạt yêu cầu hiển thị.' : undefined);
      await loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không cập nhật được sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Duyệt nội dung</Text>
        <Pressable onPress={() => loadData().catch(() => undefined)} style={styles.iconButton}>
          <Ionicons name="refresh-outline" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>Đang tải danh sách chờ duyệt...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Đại lý chờ duyệt</Text>
          {partners.map((partner) => (
            <View key={partner.id} style={styles.card}>
              <Text style={styles.cardTitle}>{partner.storeName || partner.companyName}</Text>
              <Text style={styles.cardText}>{partner.contactEmail} · {partner.phone}</Text>
              {!!partner.address && <Text style={styles.cardText}>{partner.address}</Text>}
              <View style={styles.infoGrid}>
                <InfoLine label="Người đại diện" value={partner.representativeName || 'Chưa nhập'} />
                <InfoLine label="Vai trò" value={partner.representativeRole || 'Chưa nhập'} />
                <InfoLine label="Khu vực phục vụ" value={partner.serviceArea || 'Chưa nhập'} />
                <InfoLine label="Sản phẩm chính" value={partner.mainProducts || 'Chưa nhập'} />
                <InfoLine label="Mã số thuế/GPKD" value={partner.businessLicense || 'Chưa nhập'} />
              </View>
              <View style={styles.documentBadges}>
                <StatusBadge ok={Boolean(partner.businessLicenseFileUrl)} label={partner.businessLicenseFileUrl ? 'Có file giấy phép' : 'Thiếu file giấy phép'} />
                <StatusBadge ok={Boolean(partner.coverUrl)} label={partner.coverUrl ? 'Có ảnh cửa hàng' : 'Thiếu ảnh cửa hàng'} />
                <StatusBadge ok={Boolean(partner.advertisingCommitmentAccepted)} label={partner.advertisingCommitmentAccepted ? 'Đã cam kết' : 'Chưa cam kết'} />
              </View>
              <View style={styles.actionRow}>
                <Pressable disabled={saving} onPress={() => approvePartner(partner, 'active')} style={styles.approveButton}>
                  <Text style={styles.approveText}>Duyệt</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => approvePartner(partner, 'rejected')} style={styles.rejectButton}>
                  <Text style={styles.rejectText}>Từ chối</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {partners.length === 0 && <Text style={styles.stateText}>Không có đại lý chờ duyệt.</Text>}

          <Text style={[styles.sectionTitle, styles.secondSection]}>Sản phẩm chờ duyệt</Text>
          {products.map((product) => (
            <View key={product.id} style={styles.card}>
              <Text style={styles.cardTitle}>{product.name}</Text>
              <Text style={styles.cardText}>{product.partnerName || 'Đại lý'} · {product.priceRange || 'Chưa nhập giá'}</Text>
              {!!product.description && <Text numberOfLines={2} style={styles.cardText}>{product.description}</Text>}
              <View style={styles.actionRow}>
                <Pressable disabled={saving} onPress={() => approveProduct(product, 'approved')} style={styles.approveButton}>
                  <Text style={styles.approveText}>Duyệt</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => approveProduct(product, 'rejected')} style={styles.rejectButton}>
                  <Text style={styles.rejectText}>Từ chối</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {products.length === 0 && <Text style={styles.stateText}>Không có sản phẩm chờ duyệt.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[styles.statusBadge, ok ? styles.statusBadgeOk : styles.statusBadgeMissing]}>
      <Ionicons name={ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={14} color={ok ? theme.colors.primary : theme.colors.moderate} />
      <Text style={[styles.statusBadgeText, { color: ok ? theme.colors.primary : theme.colors.moderate }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgCard },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  content: { padding: 18, paddingBottom: 42 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary, marginBottom: 12 },
  secondSection: { marginTop: 22 },
  card: { padding: 14, borderRadius: 8, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 },
  cardTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 5 },
  cardText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  infoGrid: { marginTop: 10, gap: 6 },
  infoLine: { padding: 9, borderRadius: 8, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  infoLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '800', marginBottom: 3 },
  infoValue: { color: theme.colors.textPrimary, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  documentBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  statusBadge: { minHeight: 28, borderRadius: 14, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 },
  statusBadgeOk: { backgroundColor: '#F0FAF3', borderColor: '#CDEBD4' },
  statusBadgeMissing: { backgroundColor: '#FFF8EA', borderColor: '#FFE1A6' },
  statusBadgeText: { fontSize: 11, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveButton: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  approveText: { color: theme.colors.white, fontWeight: '900' },
  rejectButton: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.severeBg, borderWidth: 1, borderColor: '#F1CDD3' },
  rejectText: { color: theme.colors.severe, fontWeight: '900' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 },
  errorText: { color: theme.colors.severe, fontSize: 14, textAlign: 'center' },
});
