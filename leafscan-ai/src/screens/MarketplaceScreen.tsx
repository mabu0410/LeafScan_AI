import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { PartnerProduct, PartnerStore, RootStackParamList } from '../types';
import { listMarketplacePartnersApi, listMarketplaceProductsApi, trackProductClickApi } from '../api/marketplace';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

type Route = RouteProp<RootStackParamList, 'Marketplace'> & { name?: string };

export default function MarketplaceScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const isTabScreen = (route as unknown as { name?: string }).name === 'MarketplaceTab';
  const token = useAuthStore((state) => state.accessToken);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [partners, setPartners] = useState<PartnerStore[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (nextQuery = '', showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextProducts, nextPartners] = await Promise.all([
        listMarketplaceProductsApi({
          diseaseKey: route.params?.diseaseKey,
          category: route.params?.category,
          q: nextQuery.trim() || undefined,
        }),
        listMarketplacePartnersApi(),
      ]);
      setProducts(nextProducts);
      setPartners(nextPartners);
    } catch (err: any) {
      setError(err?.message || t('marketplace.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params?.category, route.params?.diseaseKey, t]);

  useEffect(() => {
    loadData('').catch(() => undefined);
  }, [loadData]);

  const openProduct = async (product: PartnerProduct) => {
    if (token) {
      trackProductClickApi(token, product.id).catch(() => undefined);
    }
    navigation.navigate('PartnerProductDetail', { product });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isTabScreen ? (
          <View style={styles.iconButton}>
            <Ionicons name="storefront-outline" size={20} color={theme.colors.primary} />
          </View>
        ) : (
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>{t('marketplace.title')}</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => loadData(query).catch(() => undefined)}
          placeholder={t('marketplace.searchPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        <Pressable onPress={() => loadData(query).catch(() => undefined)} hitSlop={8}>
          <Ionicons name="arrow-forward-circle" size={22} color={theme.colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>{t('marketplace.loadingProducts')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadData(query).catch(() => undefined)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(query, true).catch(() => undefined)} />}
          showsVerticalScrollIndicator={false}
        >
          {partners.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('marketplace.activeDealers')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partnerRow}>
                {partners.map((partner) => (
                  <Pressable key={partner.id} style={styles.partnerChip} onPress={() => navigation.navigate('PartnerStore', { partnerId: partner.id })}>
                    {partner.logoUrl ? (
                      <Image source={{ uri: partner.logoUrl }} style={styles.partnerLogo} />
                    ) : (
                      <View style={styles.partnerLogoFallback}>
                        <Ionicons name="storefront-outline" size={18} color={theme.colors.primary} />
                      </View>
                    )}
                    <Text numberOfLines={1} style={styles.partnerName}>{partner.storeName || partner.companyName}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('marketplace.matchingProducts')}</Text>
            {products.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="leaf-outline" size={30} color={theme.colors.textMuted} />
                <Text style={styles.stateText}>{t('marketplace.noProducts')}</Text>
              </View>
            ) : (
              products.map((product) => (
                <Pressable key={product.id} style={styles.productCard} onPress={() => openProduct(product)}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImageFallback}>
                      <Ionicons name="leaf-outline" size={24} color={theme.colors.primary} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
                    <Text numberOfLines={1} style={styles.partnerText}>{product.partnerName || t('marketplace.defaultPartner')}</Text>
                    {!!product.priceRange && <Text style={styles.priceText}>{product.priceRange}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgCard,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  searchRow: {
    margin: 16,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 15, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingBottom: 36 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 12 },
  partnerRow: { gap: 10, paddingRight: 16 },
  partnerChip: {
    width: 132,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  partnerLogo: { width: 42, height: 42, borderRadius: 21, marginBottom: 10 },
  partnerLogoFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryPale,
  },
  partnerName: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 13 },
  productCard: {
    minHeight: 104,
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImage: { width: 78, height: 78, borderRadius: 8, backgroundColor: theme.colors.bgMuted },
  productImageFallback: {
    width: 78,
    height: 78,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  partnerText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 5 },
  priceText: { color: theme.colors.accent, fontSize: 13, fontWeight: '800', marginTop: 6 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 8, color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center' },
  errorText: { color: theme.colors.severe, fontSize: 14, textAlign: 'center', marginBottom: 14 },
  primaryButton: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '800' },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgCard,
  },
});
