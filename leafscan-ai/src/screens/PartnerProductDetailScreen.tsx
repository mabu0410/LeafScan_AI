import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { createMarketplaceInquiryApi } from '../api/marketplace';
import { MarketplaceInquiryModal } from '../components/MarketplaceInquiryModal';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

type Route = RouteProp<RootStackParamList, 'PartnerProductDetail'>;

const PRODUCT_PLACEHOLDER = 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&q=80';

export default function PartnerProductDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const { product } = route.params;
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [sendingInquiry, setSendingInquiry] = useState(false);

  const openProduct = async () => {
    if (!product.productUrl) {
      Alert.alert(t('marketplace.noProductLinkTitle'), t('marketplace.noProductLinkBody'));
      return;
    }
    const supported = await Linking.canOpenURL(product.productUrl);
    if (!supported) {
      Alert.alert(t('marketplace.openLinkFailedTitle'), t('marketplace.openLinkFailedBody'));
      return;
    }
    await Linking.openURL(product.productUrl);
  };

  const submitInquiry = async (input: { name: string; phone?: string; email?: string; message: string }) => {
    if (!token) return;
    setSendingInquiry(true);
    try {
      await createMarketplaceInquiryApi(token, { productId: product.id, ...input });
      setInquiryOpen(false);
      Alert.alert('Đã gửi yêu cầu', 'Đại lý sẽ liên hệ lại theo thông tin bạn cung cấp.');
    } catch (error: any) {
      Alert.alert('Không gửi được yêu cầu', error?.message || 'Vui lòng thử lại.');
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
        <Text style={styles.headerTitle}>{t('marketplace.productDetail')}</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: product.imageUrl || PRODUCT_PLACEHOLDER }} style={styles.image} />
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.partner}>{product.partnerName || t('marketplace.defaultPartner')}</Text>
        {!!product.priceRange && <Text style={styles.price}>{product.priceRange}</Text>}

        {!!product.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('marketplace.description')}</Text>
            <Text style={styles.bodyText}>{product.description}</Text>
          </View>
        )}

        {(product.targetDiseases.length > 0 || product.targetCategories.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('marketplace.suitableFor')}</Text>
            <View style={styles.chipWrap}>
              {[...product.targetCategories, ...product.targetDiseases].map((item) => (
                <View key={item} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => navigation.navigate('PartnerStore', { partnerId: product.partnerId })} style={styles.storeButton}>
          <Ionicons name="storefront-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.storeButtonText}>{t('marketplace.viewStore')}</Text>
        </Pressable>
        <Pressable onPress={() => setInquiryOpen(true)} style={styles.primaryButton}>
          <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.white} />
          <Text style={styles.primaryButtonText}>Yêu cầu tư vấn</Text>
        </Pressable>
      </View>
      {!!product.productUrl && (
        <Pressable onPress={openProduct} style={styles.floatingLink}>
          <Ionicons name="open-outline" size={17} color={theme.colors.primary} />
          <Text style={styles.floatingLinkText}>{t('marketplace.buyContact')}</Text>
        </Pressable>
      )}
      <MarketplaceInquiryModal
        visible={inquiryOpen}
        title={product.name}
        defaultName={user?.name}
        defaultPhone={user?.phone}
        defaultEmail={user?.email}
        loading={sendingInquiry}
        onClose={() => setInquiryOpen(false)}
        onSubmit={submitInquiry}
      />
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
  content: { padding: 20, paddingBottom: 120 },
  image: { width: '100%', height: 260, borderRadius: 8, backgroundColor: theme.colors.bgMuted, marginBottom: 18 },
  name: { fontSize: 24, lineHeight: 30, fontWeight: '900', color: theme.colors.textPrimary },
  partner: { marginTop: 6, color: theme.colors.textSecondary, fontWeight: '800' },
  price: { marginTop: 12, color: theme.colors.accent, fontSize: 18, fontWeight: '900' },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: theme.colors.textPrimary, marginBottom: 10 },
  bodyText: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 23 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.colors.primaryPale },
  chipText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    gap: 10,
  },
  storeButton: { flex: 1, height: 48, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  storeButtonText: { color: theme.colors.primary, fontWeight: '900' },
  primaryButton: { flex: 1, height: 48, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '900' },
  floatingLink: { position: 'absolute', right: 16, bottom: 92, minHeight: 40, borderRadius: 999, paddingHorizontal: 14, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 7 },
  floatingLinkText: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
});
