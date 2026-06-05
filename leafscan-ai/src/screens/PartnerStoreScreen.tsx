import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { PartnerProduct, PartnerStore, RootStackParamList } from '../types';
import { createMarketplaceInquiryApi, getMarketplacePartnerApi, listMarketplaceProductsApi } from '../api/marketplace';
import { MarketplaceInquiryModal } from '../components/MarketplaceInquiryModal';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

type Route = RouteProp<RootStackParamList, 'PartnerStore'>;

const PRODUCT_PLACEHOLDER = 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80';

export default function PartnerStoreScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [partner, setPartner] = useState<PartnerStore | null>(null);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [sendingInquiry, setSendingInquiry] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPartner, nextProducts] = await Promise.all([
        getMarketplacePartnerApi(route.params.partnerId),
        listMarketplaceProductsApi({ partnerId: route.params.partnerId }),
      ]);
      setPartner(nextPartner);
      setProducts(nextProducts);
    } catch (err: any) {
      setError(err?.message || t('marketplace.storeLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [route.params.partnerId, t]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const openPhone = async () => {
    if (!partner?.phone) return;
    const url = `tel:${partner.phone}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(t('marketplace.callFailedTitle'), t('marketplace.callFailedBody'));
      return;
    }
    await Linking.openURL(url);
  };

  const submitInquiry = async (input: { name: string; phone?: string; email?: string; message: string }) => {
    if (!token || !partner) return;
    setSendingInquiry(true);
    try {
      await createMarketplaceInquiryApi(token, { partnerId: partner.id, ...input });
      setInquiryOpen(false);
      Alert.alert('Đã gửi yêu cầu', 'Đại lý sẽ liên hệ lại theo thông tin bạn cung cấp.');
    } catch (err: any) {
      Alert.alert('Không gửi được yêu cầu', err?.message || 'Vui lòng thử lại.');
    } finally {
      setSendingInquiry(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('marketplace.storeTitle')}</Text>
        <View style={styles.iconButton} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>{t('marketplace.storeLoading')}</Text>
        </View>
      ) : error || !partner ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error || t('marketplace.storeNotFound')}</Text>
          <Pressable onPress={() => loadData().catch(() => undefined)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {partner.logoUrl ? (
              <Image source={{ uri: partner.logoUrl }} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Ionicons name="storefront-outline" size={30} color={theme.colors.primary} />
              </View>
            )}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{partner.storeName || partner.companyName}</Text>
              <Text style={styles.companyName}>{partner.companyName}</Text>
              {!!partner.address && <Text style={styles.address}>{partner.address}</Text>}
            </View>
          </View>

          {!!partner.description && <Text style={styles.description}>{partner.description}</Text>}

          <View style={styles.actionRow}>
            <Pressable onPress={openPhone} style={styles.actionButton}>
              <Ionicons name="call-outline" size={18} color={theme.colors.white} />
              <Text style={styles.actionText}>{t('marketplace.callDealer')}</Text>
            </Pressable>
            <Pressable onPress={() => setInquiryOpen(true)} style={[styles.actionButton, styles.inquiryButton]}>
              <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.white} />
              <Text style={styles.actionText}>Yêu cầu tư vấn</Text>
            </Pressable>
            {!!partner.contactUrl && (
              <Pressable onPress={() => Linking.openURL(partner.contactUrl as string)} style={[styles.actionButton, styles.secondaryAction]}>
                <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.secondaryActionText}>{t('marketplace.contact')}</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('marketplace.displayedProducts')}</Text>
          {products.map((product) => (
            <Pressable key={product.id} style={styles.productCard} onPress={() => navigation.navigate('PartnerProductDetail', { product })}>
              <Image source={{ uri: product.imageUrl || PRODUCT_PLACEHOLDER }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
                {!!product.priceRange && <Text style={styles.priceText}>{product.priceRange}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
          {products.length === 0 && <Text style={styles.stateText}>{t('marketplace.noApprovedProducts')}</Text>}
        </ScrollView>
      )}
      {partner && (
        <MarketplaceInquiryModal
          visible={inquiryOpen}
          title={partner.storeName || partner.companyName}
          defaultName={user?.name}
          defaultPhone={user?.phone}
          defaultEmail={user?.email}
          loading={sendingInquiry}
          onClose={() => setInquiryOpen(false)}
          onSubmit={submitInquiry}
        />
      )}
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
  content: { padding: 20, paddingBottom: 42 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  logo: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.bgMuted },
  logoFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primaryPale, alignItems: 'center', justifyContent: 'center' },
  storeInfo: { flex: 1, minWidth: 0 },
  storeName: { fontSize: 22, lineHeight: 28, fontWeight: '900', color: theme.colors.textPrimary },
  companyName: { marginTop: 4, fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  address: { marginTop: 4, fontSize: 13, color: theme.colors.textSecondary },
  description: { fontSize: 14, lineHeight: 21, color: theme.colors.textSecondary, marginBottom: 18 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionButton: { height: 46, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inquiryButton: { backgroundColor: '#0F8F58' },
  actionText: { color: theme.colors.white, fontWeight: '800' },
  secondaryAction: { backgroundColor: theme.colors.primaryPale, borderWidth: 1, borderColor: theme.colors.primary },
  secondaryActionText: { color: theme.colors.primary, fontWeight: '800' },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: theme.colors.textPrimary, marginBottom: 12 },
  productCard: { minHeight: 98, padding: 10, marginBottom: 10, borderRadius: 8, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  productImage: { width: 76, height: 76, borderRadius: 8, backgroundColor: theme.colors.bgMuted },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { color: theme.colors.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  priceText: { marginTop: 7, color: theme.colors.accent, fontSize: 13, fontWeight: '900' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 },
  errorText: { color: theme.colors.severe, fontSize: 14, textAlign: 'center', marginBottom: 14 },
  primaryButton: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '800' },
});
