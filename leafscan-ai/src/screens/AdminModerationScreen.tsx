import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
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
      setError(err?.message || t('adminModeration.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const approvePartner = async (partner: PartnerStore, status: 'active' | 'rejected') => {
    if (!token) return;
    setSaving(true);
    try {
      await adminUpdatePartnerStatusApi(token, partner.id, status, status === 'rejected' ? t('adminModeration.partnerRejectReason') : undefined);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('adminModeration.partnerUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const approveProduct = async (product: PartnerProduct, status: 'approved' | 'rejected') => {
    if (!token) return;
    setSaving(true);
    try {
      await adminUpdateProductStatusApi(token, product.id, status, status === 'rejected' ? t('adminModeration.productRejectReason') : undefined);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('adminModeration.productUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => (navigation.canGoBack() ? navigation.goBack() : logout())} style={styles.iconButton}>
          <Ionicons name={navigation.canGoBack() ? 'chevron-back' : 'log-out-outline'} size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('adminModeration.title')}</Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>{user?.email || 'Admin'}</Text>
        </View>
        <Pressable onPress={() => loadData().catch(() => undefined)} style={styles.iconButton}>
          <Ionicons name="refresh-outline" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>{t('adminModeration.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t('adminModeration.pendingPartners')}</Text>
          <View style={styles.summaryRow}>
            <SummaryPill icon="business-outline" label={t('adminModeration.partner')} value={partners.length} />
            <SummaryPill icon="cube-outline" label={t('adminModeration.product')} value={products.length} />
          </View>
          {partners.map((partner) => (
            <View key={partner.id} style={styles.card}>
              <Text style={styles.cardTitle}>{partner.storeName || partner.companyName}</Text>
              <Text style={styles.cardText}>{partner.contactEmail} · {partner.phone}</Text>
              {!!partner.address && <Text style={styles.cardText}>{partner.address}</Text>}
              <View style={styles.infoGrid}>
                <InfoLine label={t('adminModeration.representative')} value={partner.representativeName || t('adminModeration.missingValue')} />
                <InfoLine label={t('adminModeration.role')} value={partner.representativeRole || t('adminModeration.missingValue')} />
                <InfoLine label={t('adminModeration.serviceArea')} value={partner.serviceArea || t('adminModeration.missingValue')} />
                <InfoLine label={t('adminModeration.mainProducts')} value={partner.mainProducts || t('adminModeration.missingValue')} />
                <InfoLine label={t('adminModeration.businessLicense')} value={partner.businessLicense || t('adminModeration.missingValue')} />
              </View>
              <View style={styles.documentBadges}>
                <StatusBadge ok={Boolean(partner.businessLicenseFileUrl)} label={partner.businessLicenseFileUrl ? t('adminModeration.hasLicenseFile') : t('adminModeration.missingLicenseFile')} />
                <StatusBadge ok={Boolean(partner.coverUrl)} label={partner.coverUrl ? t('adminModeration.hasStorePhoto') : t('adminModeration.missingStorePhoto')} />
                <StatusBadge ok={Boolean(partner.advertisingCommitmentAccepted)} label={partner.advertisingCommitmentAccepted ? t('adminModeration.committed') : t('adminModeration.notCommitted')} />
              </View>
              <View style={styles.actionRow}>
                <Pressable disabled={saving} onPress={() => approvePartner(partner, 'active')} style={styles.approveButton}>
                  <Text style={styles.approveText}>{t('adminModeration.approve')}</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => approvePartner(partner, 'rejected')} style={styles.rejectButton}>
                  <Text style={styles.rejectText}>{t('adminModeration.reject')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {partners.length === 0 && <Text style={styles.stateText}>{t('adminModeration.noPendingPartners')}</Text>}

          <Text style={[styles.sectionTitle, styles.secondSection]}>{t('adminModeration.pendingProducts')}</Text>
          {products.map((product) => (
            <View key={product.id} style={styles.card}>
              <Text style={styles.cardTitle}>{product.name}</Text>
              <Text style={styles.cardText}>{product.partnerName || t('adminModeration.defaultPartner')} · {product.priceRange || t('adminModeration.missingPrice')}</Text>
              {!!product.description && <Text numberOfLines={2} style={styles.cardText}>{product.description}</Text>}
              <View style={styles.actionRow}>
                <Pressable disabled={saving} onPress={() => approveProduct(product, 'approved')} style={styles.approveButton}>
                  <Text style={styles.approveText}>{t('adminModeration.approve')}</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => approveProduct(product, 'rejected')} style={styles.rejectButton}>
                  <Text style={styles.rejectText}>{t('adminModeration.reject')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {products.length === 0 && <Text style={styles.stateText}>{t('adminModeration.noPendingProducts')}</Text>}
        </ScrollView>
      )}
    </View>
  );
}

function SummaryPill({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View style={styles.summaryPill}>
      <Ionicons name={icon} size={17} color={theme.colors.primary} />
      <Text style={styles.summaryText}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  headerSubtitle: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, maxWidth: '100%' },
  content: { padding: 18, paddingBottom: 42 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryPill: { flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 7 },
  summaryText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800', flex: 1 },
  summaryValue: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '900' },
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
