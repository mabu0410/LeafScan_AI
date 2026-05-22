import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PartnerProduct, PartnerStore, RootStackParamList } from '../types';
import {
  createProductApi,
  createVnpayPartnerPaymentApi,
  deleteProductApi,
  getMyPartnerApi,
  getPaymentStatusApi,
  listMyProductsApi,
  registerPartnerApi,
  updateMyPartnerApi,
  updateProductApi,
  uploadPartnerBusinessLicenseApi,
  uploadPartnerCoverApi,
  uploadPartnerLogoApi,
  uploadProductImageApi,
  PartnerPlanType,
} from '../api/marketplace';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type PartnerTab = 'profile' | 'products';

interface PartnerFormState {
  companyName: string;
  storeName: string;
  description: string;
  address: string;
  contactEmail: string;
  phone: string;
  businessLicense: string;
  representativeName: string;
  representativeRole: string;
  serviceArea: string;
  mainProducts: string;
  advertisingCommitmentAccepted: boolean;
  productCategories: string;
  websiteUrl: string;
  contactUrl: string;
}

interface PartnerFileSelection {
  uri: string;
  name: string;
  mimeType?: string;
}

interface ProductFormState {
  name: string;
  description: string;
  priceRange: string;
  productUrl: string;
  targetDiseases: string;
  targetCategories: string;
}

const EMPTY_PARTNER_FORM: PartnerFormState = {
  companyName: '',
  storeName: '',
  description: '',
  address: '',
  contactEmail: '',
  phone: '',
  businessLicense: '',
  representativeName: '',
  representativeRole: '',
  serviceArea: '',
  mainProducts: '',
  advertisingCommitmentAccepted: false,
  productCategories: '',
  websiteUrl: '',
  contactUrl: '',
};

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  description: '',
  priceRange: '',
  productUrl: '',
  targetDiseases: '',
  targetCategories: '',
};

const GREEN = '#007C39';
const BG = '#FBFCF8';
const CARD = '#FFFFFF';
const BORDER = '#E5EFE6';
const TEXT = '#171326';
const MUTED = '#6F7180';
const ORANGE = '#F08A00';
const BLUE = '#0EA5E9';

const CATEGORY_OPTIONS = [
  'Phân bón, hạt giống, thuốc sinh học',
  'Phân bón và dinh dưỡng cây trồng',
  'Hạt giống và cây con',
  'Thuốc bảo vệ thực vật',
];

const PARTNER_PLANS: Array<{
  type: PartnerPlanType;
  title: string;
  price: string;
  duration: string;
  note: string;
}> = [
  {
    type: 'monthly',
    title: 'Gói tháng',
    price: '99.000đ',
    duration: '30 ngày',
    note: 'Tối đa 20 sản phẩm active',
  },
  {
    type: 'yearly',
    title: 'Gói năm',
    price: '990.000đ',
    duration: '365 ngày',
    note: 'Tiết kiệm khoảng 2 tháng',
  },
];

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCsv(value?: string[]): string {
  return (value || []).join(', ');
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function partnerStatusLabel(status?: string): string {
  if (status === 'active') return 'Đã duyệt';
  if (status === 'pending_review') return 'Chờ admin duyệt';
  if (status === 'rejected') return 'Bị từ chối';
  if (status === 'suspended') return 'Tạm khóa';
  return status || 'Chưa đăng ký';
}

function productStatusLabel(status?: string): string {
  if (status === 'approved') return 'Đã duyệt';
  if (status === 'pending_review') return 'Chờ duyệt';
  if (status === 'rejected') return 'Bị từ chối';
  return status || 'Chưa rõ';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string): boolean {
  return /^0\d{9}$/.test(value.trim().replace(/\s/g, ''));
}

function initialsFromName(value?: string): string {
  const parts = (value || 'Đối tác')
    .split(' ')
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.slice(-2).map((item) => item[0]).join('').toUpperCase() || 'ĐT';
}

export default function PartnerChannelScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState<PartnerTab>('profile');
  const [partner, setPartner] = useState<PartnerStore | null>(null);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [partnerForm, setPartnerForm] = useState<PartnerFormState>({
    ...EMPTY_PARTNER_FORM,
    contactEmail: user?.email || '',
    phone: user?.phone || '',
  });
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [editingProduct, setEditingProduct] = useState<PartnerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingPlan, setPayingPlan] = useState<PartnerPlanType | null>(null);
  const [pendingLogoUri, setPendingLogoUri] = useState<string | null>(null);
  const [pendingStorePhotoUri, setPendingStorePhotoUri] = useState<string | null>(null);
  const [pendingLicenseFile, setPendingLicenseFile] = useState<PartnerFileSelection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManageProducts = partner?.status === 'active' && Boolean(partner.activeMembership);
  const needsPayment = partner?.status === 'active' && !partner.activeMembership;
  const partnerTitle = partner?.storeName || partner?.companyName || 'Nhà đối tác vật tư';
  const initials = useMemo(() => initialsFromName(partnerTitle || user?.name), [partnerTitle, user?.name]);
  const canSubmitRegistration =
    Boolean(partnerForm.storeName.trim()) &&
    Boolean(partnerForm.description.trim()) &&
    Boolean(partnerForm.address.trim()) &&
    Boolean(partnerForm.businessLicense.trim()) &&
    Boolean(partnerForm.representativeName.trim()) &&
    Boolean(partnerForm.representativeRole.trim()) &&
    Boolean(partnerForm.serviceArea.trim()) &&
    Boolean(partnerForm.mainProducts.trim()) &&
    partnerForm.advertisingCommitmentAccepted &&
    Boolean(pendingStorePhotoUri) &&
    Boolean(pendingLicenseFile) &&
    splitCsv(partnerForm.productCategories).length > 0 &&
    isValidEmail(partnerForm.contactEmail) &&
    isValidPhone(partnerForm.phone);

  const syncPartnerForm = useCallback((nextPartner: PartnerStore | null) => {
    if (!nextPartner) {
      setPartnerForm((current) => ({
        ...EMPTY_PARTNER_FORM,
        contactEmail: current.contactEmail || user?.email || '',
        phone: current.phone || user?.phone || '',
      }));
      return;
    }
    setPartnerForm({
      companyName: nextPartner.companyName || '',
      storeName: nextPartner.storeName || '',
      description: nextPartner.description || '',
      address: nextPartner.address || '',
      contactEmail: nextPartner.contactEmail || '',
      phone: nextPartner.phone || '',
      businessLicense: nextPartner.businessLicense || '',
      representativeName: nextPartner.representativeName || '',
      representativeRole: nextPartner.representativeRole || '',
      serviceArea: nextPartner.serviceArea || '',
      mainProducts: nextPartner.mainProducts || '',
      advertisingCommitmentAccepted: Boolean(nextPartner.advertisingCommitmentAccepted),
      productCategories: joinCsv(nextPartner.productCategories),
      websiteUrl: nextPartner.websiteUrl || '',
      contactUrl: nextPartner.contactUrl || '',
    });
  }, [user?.email, user?.phone]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const nextPartner = await getMyPartnerApi(token);
      setPartner(nextPartner);
      syncPartnerForm(nextPartner);
      if (nextPartner) {
        setProducts(await listMyProductsApi(token));
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Không tải được kênh đối tác.');
    } finally {
      setLoading(false);
    }
  }, [syncPartnerForm, token]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const updatePartnerField = (field: keyof PartnerFormState, value: string | boolean) => {
    setPartnerForm((current) => ({ ...current, [field]: value }));
  };

  const updateProductField = (field: keyof ProductFormState, value: string) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const submitPartner = async () => {
    if (!token) return;
    if (!partnerForm.storeName.trim() || !partnerForm.description.trim() || !partnerForm.address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên cửa hàng, mô tả và địa chỉ.');
      return;
    }
    if (!isValidEmail(partnerForm.contactEmail)) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập email liên hệ đúng định dạng.');
      return;
    }
    if (!isValidPhone(partnerForm.phone)) {
      Alert.alert('Số điện thoại không hợp lệ', 'Số điện thoại cần bắt đầu bằng 0 và đủ 10 chữ số.');
      return;
    }
    if (splitCsv(partnerForm.productCategories).length === 0) {
      Alert.alert('Thiếu nhóm sản phẩm', 'Vui lòng chọn nhóm sản phẩm chính.');
      return;
    }
    if (
      !partnerForm.businessLicense.trim() ||
      !partnerForm.representativeName.trim() ||
      !partnerForm.representativeRole.trim() ||
      !partnerForm.serviceArea.trim() ||
      !partnerForm.mainProducts.trim()
    ) {
      Alert.alert('Thiếu thông tin xét duyệt', 'Vui lòng nhập người đại diện, vai trò, khu vực phục vụ, sản phẩm chính và mã số thuế/giấy phép.');
      return;
    }
    if (!partnerForm.advertisingCommitmentAccepted) {
      Alert.alert('Cần xác nhận cam kết', 'Bạn cần xác nhận nội dung quảng cáo là đúng sự thật và chịu trách nhiệm trước khi gửi hồ sơ.');
      return;
    }
    if (!partner && (!pendingStorePhotoUri || !pendingLicenseFile)) {
      Alert.alert('Thiếu tài liệu bắt buộc', 'Vui lòng chọn ảnh cửa hàng và file giấy phép kinh doanh trước khi gửi hồ sơ.');
      return;
    }

    setSaving(true);
    try {
      const storeName = partnerForm.storeName.trim();
      const payload = {
        companyName: partnerForm.companyName.trim() || storeName,
        storeName,
        description: partnerForm.description.trim() || undefined,
        address: partnerForm.address.trim() || undefined,
        contactEmail: partnerForm.contactEmail.trim(),
        phone: partnerForm.phone.trim(),
        businessLicense: partnerForm.businessLicense.trim(),
        representativeName: partnerForm.representativeName.trim(),
        representativeRole: partnerForm.representativeRole.trim(),
        serviceArea: partnerForm.serviceArea.trim(),
        mainProducts: partnerForm.mainProducts.trim(),
        advertisingCommitmentAccepted: partnerForm.advertisingCommitmentAccepted,
        productCategories: splitCsv(partnerForm.productCategories),
        websiteUrl: partnerForm.websiteUrl.trim() || undefined,
        contactUrl: partnerForm.contactUrl.trim() || undefined,
      };
      const nextPartner = partner
        ? await updateMyPartnerApi(token, payload)
        : await registerPartnerApi(token, payload);
      let savedPartner = nextPartner;
      if (!partner && pendingLogoUri) {
        try {
          savedPartner = await uploadPartnerLogoApi(token, pendingLogoUri);
          setPendingLogoUri(null);
        } catch {
          Alert.alert('Hồ sơ đã gửi', 'Logo chưa upload được. Bạn có thể upload lại sau khi hồ sơ được tạo.');
        }
      }
      if (!partner) {
        try {
          if (pendingStorePhotoUri) {
            savedPartner = await uploadPartnerCoverApi(token, pendingStorePhotoUri);
            setPendingStorePhotoUri(null);
          }
          if (pendingLicenseFile) {
            savedPartner = await uploadPartnerBusinessLicenseApi(
              token,
              pendingLicenseFile.uri,
              pendingLicenseFile.name,
              pendingLicenseFile.mimeType
            );
            setPendingLicenseFile(null);
          }
        } catch (uploadError: any) {
          setPartner(savedPartner);
          syncPartnerForm(savedPartner);
          Alert.alert(
            'Hồ sơ đã tạo nhưng chưa đủ tài liệu',
            uploadError?.message || 'Upload ảnh cửa hàng hoặc giấy phép kinh doanh thất bại. Vui lòng upload lại trong mục Tài liệu xét duyệt.'
          );
          return;
        }
      }
      setPartner(savedPartner);
      syncPartnerForm(savedPartner);
      Alert.alert(
        partner ? 'Đã lưu hồ sơ' : 'Đã gửi hồ sơ',
        partner ? 'Thông tin đối tác đã được cập nhật.' : 'Admin sẽ duyệt hồ sơ trước khi bạn thanh toán và đăng sản phẩm.'
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không lưu được hồ sơ đối tác.');
    } finally {
      setSaving(false);
    }
  };

  const pickPendingLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setPendingLogoUri(result.assets[0].uri);
  };

  const pickPendingStorePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setPendingStorePhotoUri(result.assets[0].uri);
  };

  const pickPendingBusinessLicense = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setPendingLicenseFile({
      uri: asset.uri,
      name: asset.name || `business_license_${Date.now()}.pdf`,
      mimeType: asset.mimeType,
    });
  };

  const openAddressInMaps = () => {
    const query = partnerForm.address.trim() || partnerForm.storeName.trim();
    if (!query) {
      Alert.alert('Chưa có địa chỉ', 'Vui lòng nhập địa chỉ cửa hàng trước khi kiểm tra bản đồ.');
      return;
    }
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(query)}`).catch(() => {
      Alert.alert('Không mở được bản đồ', 'Vui lòng kiểm tra lại thiết bị hoặc kết nối mạng.');
    });
  };

  const pickAndUploadLogo = async () => {
    if (!token || !partner) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setSaving(true);
    try {
      const nextPartner = await uploadPartnerLogoApi(token, result.assets[0].uri);
      setPartner(nextPartner);
      syncPartnerForm(nextPartner);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Upload logo thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadCover = async () => {
    if (!token || !partner) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setSaving(true);
    try {
      const nextPartner = await uploadPartnerCoverApi(token, result.assets[0].uri);
      setPartner(nextPartner);
      syncPartnerForm(nextPartner);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Upload ảnh cửa hàng thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadBusinessLicense = async () => {
    if (!token || !partner) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setSaving(true);
    try {
      const nextPartner = await uploadPartnerBusinessLicenseApi(
        token,
        asset.uri,
        asset.name || `business_license_${Date.now()}.pdf`,
        asset.mimeType
      );
      setPartner(nextPartner);
      syncPartnerForm(nextPartner);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Upload giấy phép kinh doanh thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const startPayment = async (planType: PartnerPlanType) => {
    if (!token) return;
    setSaving(true);
    setPayingPlan(planType);
    try {
      const payment = await createVnpayPartnerPaymentApi(token, planType);
      await WebBrowser.openBrowserAsync(payment.paymentUrl);
      const status = await getPaymentStatusApi(token, payment.txnRef);
      await loadData();
      const planLabel = PARTNER_PLANS.find((item) => item.type === payment.planType)?.title || 'gói đối tác';
      Alert.alert(
        'Trạng thái thanh toán',
        status.status === 'success'
          ? `Thanh toán thành công, ${planLabel.toLowerCase()} đã được kích hoạt.`
          : 'Giao dịch chưa hoàn tất. Vui lòng kiểm tra lại sau khi VNPAY gửi IPN.'
      );
    } catch (err: any) {
      Alert.alert('Lỗi thanh toán', err?.message || 'Không tạo được thanh toán VNPAY.');
    } finally {
      setSaving(false);
      setPayingPlan(null);
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT_FORM);
  };

  const beginEditProduct = (product: PartnerProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      priceRange: product.priceRange || '',
      productUrl: product.productUrl || '',
      targetDiseases: joinCsv(product.targetDiseases),
      targetCategories: joinCsv(product.targetCategories),
    });
  };

  const submitProduct = async () => {
    if (!token || !canManageProducts) return;
    if (!productForm.name.trim()) {
      Alert.alert('Thiếu tên sản phẩm', 'Vui lòng nhập tên sản phẩm.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim() || undefined,
        priceRange: productForm.priceRange.trim() || undefined,
        productUrl: productForm.productUrl.trim() || undefined,
        targetDiseases: splitCsv(productForm.targetDiseases),
        targetCategories: splitCsv(productForm.targetCategories),
      };
      if (editingProduct) {
        await updateProductApi(token, editingProduct.id, payload);
      } else {
        await createProductApi(token, payload);
      }
      resetProductForm();
      await loadData();
      Alert.alert('Đã lưu sản phẩm', 'Sản phẩm sẽ hiển thị public sau khi admin duyệt.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không lưu được sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = async (product: PartnerProduct) => {
    if (!token) return;
    setSaving(true);
    try {
      await updateProductApi(token, product.id, { isActive: !product.isActive });
      await loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không cập nhật được trạng thái sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteProduct = (product: PartnerProduct) => {
    Alert.alert('Xóa sản phẩm', `Xóa "${product.name}" khỏi kênh đối tác?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          setSaving(true);
          try {
            await deleteProductApi(token, product.id);
            if (editingProduct?.id === product.id) resetProductForm();
            await loadData();
          } catch (err: any) {
            Alert.alert('Lỗi', err?.message || 'Không xóa được sản phẩm.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const pickAndUploadProductImage = async (product: PartnerProduct) => {
    if (!token) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setSaving(true);
    try {
      await uploadProductImageApi(token, product.id, result.assets[0].uri);
      await loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Upload ảnh sản phẩm thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi tài khoản đối tác?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Nhà đối tác vật tư" onBack={navigation.canGoBack() ? navigation.goBack : undefined} onLogout={confirmLogout} />
        <View style={styles.centerState}>
          <ActivityIndicator color={GREEN} />
          <Text style={styles.stateText}>Đang tải dữ liệu đối tác...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Nhà đối tác vật tư" onBack={navigation.canGoBack() ? navigation.goBack : undefined} onLogout={confirmLogout} />
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadData().catch(() => undefined)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={partner ? 'Nhà đối tác vật tư' : 'Đăng ký đối tác vật tư'} onBack={navigation.canGoBack() ? navigation.goBack : undefined} onLogout={confirmLogout} />

      <ScrollView contentContainerStyle={!partner ? styles.registrationContent : styles.content} showsVerticalScrollIndicator={false}>
        {!partner ? (
          <RegistrationForm
            form={partnerForm}
            saving={saving}
            logoUri={pendingLogoUri}
            storePhotoUri={pendingStorePhotoUri}
            licenseFileName={pendingLicenseFile?.name || null}
            canSubmit={canSubmitRegistration}
            onChange={updatePartnerField}
            onSubmit={submitPartner}
            onPickLogo={pickPendingLogo}
            onPickStorePhoto={pickPendingStorePhoto}
            onPickBusinessLicense={pickPendingBusinessLicense}
            onOpenMaps={openAddressInMaps}
          />
        ) : (
          <>
            <PartnerOverview
              partner={partner}
              initials={initials}
              productCount={products.length}
              activeCount={partner.activeProductCount}
            />

            <TabPills activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'profile' ? (
              <>
                <StatusCard partner={partner} />
                <PartnerForm
                  mode="edit"
                  form={partnerForm}
                  saving={saving}
                  onChange={updatePartnerField}
                  onSubmit={submitPartner}
                />
                <PartnerDocumentsCard
                  partner={partner}
                  saving={saving}
                  onUploadCover={pickAndUploadCover}
                  onUploadBusinessLicense={pickAndUploadBusinessLicense}
                />
                <View style={styles.card}>
                  <SectionTitle title="Logo cửa hàng" subtitle="Ảnh logo giúp cửa hàng dễ nhận diện trong marketplace." />
                  <View style={styles.logoRow}>
                    {partner.logoUrl ? (
                      <Image source={{ uri: partner.logoUrl }} style={styles.logo as any} />
                    ) : (
                      <View style={styles.logoFallback}>
                        <Ionicons name="storefront-outline" size={24} color={GREEN} />
                      </View>
                    )}
                    <Pressable disabled={saving} onPress={pickAndUploadLogo} style={styles.secondaryButton}>
                      <Ionicons name="image-outline" size={16} color={GREEN} />
                      <Text style={styles.secondaryButtonText}>Upload logo</Text>
                    </Pressable>
                  </View>
                </View>
                {needsPayment && (
                  <PaymentCard saving={saving} payingPlan={payingPlan} onPay={startPayment} />
                )}
                {partner.activeMembership && (
                  <MembershipCard partner={partner} />
                )}
              </>
            ) : (
              <>
                <ProductAccessCard partner={partner} canManageProducts={canManageProducts} onPay={startPayment} saving={saving} payingPlan={payingPlan} />
                {canManageProducts && (
                  <ProductForm
                    form={productForm}
                    editingProduct={editingProduct}
                    saving={saving}
                    onChange={updateProductField}
                    onSubmit={submitProduct}
                    onCancel={resetProductForm}
                  />
                )}
                <ProductList
                  products={products}
                  saving={saving}
                  onEdit={beginEditProduct}
                  onToggle={toggleProduct}
                  onDelete={confirmDeleteProduct}
                  onUploadImage={pickAndUploadProductImage}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
      {!partner && (
        <View style={styles.bottomCta}>
          <Pressable
            disabled={saving || !canSubmitRegistration}
            onPress={submitPartner}
            style={[styles.submitButton, (saving || !canSubmitRegistration) && styles.submitButtonDisabled]}
          >
            <Ionicons name="checkmark-outline" size={18} color={CARD} />
            <Text style={styles.submitButtonText}>{saving ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ xét duyệt'}</Text>
          </Pressable>
          <Text style={styles.ctaNote}>Bạn có thể cập nhật hồ sơ sau khi được duyệt</Text>
        </View>
      )}
    </View>
  );
}

function Header({
  title,
  onBack,
  onLogout,
}: {
  title: string;
  onBack?: () => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack || onLogout} style={styles.iconButton}>
        <Ionicons name={onBack ? 'chevron-back' : 'log-out-outline'} size={21} color={TEXT} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <Pressable onPress={onLogout} style={styles.iconButton}>
        <Ionicons name="log-out-outline" size={20} color={TEXT} />
      </Pressable>
    </View>
  );
}

function RegistrationForm({
  form,
  saving,
  logoUri,
  storePhotoUri,
  licenseFileName,
  canSubmit,
  onChange,
  onSubmit,
  onPickLogo,
  onPickStorePhoto,
  onPickBusinessLicense,
  onOpenMaps,
}: {
  form: PartnerFormState;
  saving: boolean;
  logoUri: string | null;
  storePhotoUri: string | null;
  licenseFileName: string | null;
  canSubmit: boolean;
  onChange: (field: keyof PartnerFormState, value: string | boolean) => void;
  onSubmit: () => void;
  onPickLogo: () => void;
  onPickStorePhoto: () => void;
  onPickBusinessLicense: () => void;
  onOpenMaps: () => void;
}) {
  const storeNameError = !form.storeName.trim();
  const emailError = form.contactEmail.trim().length > 0 && !isValidEmail(form.contactEmail);
  const phoneError = form.phone.trim().length > 0 && !isValidPhone(form.phone);

  return (
    <>
      <View style={styles.registrationIntro}>
        <Text style={styles.registrationSubtitle}>Hoàn thiện thông tin để quảng bá sản phẩm trên Leaf AI</Text>
      </View>

      <ProgressCard />
      <ReviewInfoCard />

      <SectionLabel
        icon="storefront-outline"
        title="Thông tin cửa hàng"
        subtitle="Thông tin này sẽ hiển thị trong hồ sơ đối tác."
      />
      <View style={styles.formSection}>
        <RegistrationField
          label="Tên cửa hàng hiển thị"
          required
          icon="storefront-outline"
          value={form.storeName}
          onChangeText={(value) => onChange('storeName', value)}
          placeholder="Ví dụ: Vật tư nông nghiệp Thành Phát"
          error={storeNameError ? 'Vui lòng nhập tên cửa hàng' : undefined}
        />
        <RegistrationField
          label="Mô tả cửa hàng"
          required
          icon="menu-outline"
          value={form.description}
          onChangeText={(value) => onChange('description', value)}
          placeholder="Mô tả ngắn về khu vực phục vụ, nhóm vật tư và thế mạnh của cửa hàng"
          helper="Nên viết 1-2 câu rõ ràng, tránh nội dung bán hàng quá dài."
          multiline
        />
        <RegistrationField
          label="Địa chỉ"
          required
          icon="location-outline"
          value={form.address}
          onChangeText={(value) => onChange('address', value)}
          placeholder="Nhập địa chỉ cửa hàng"
        />
        <MapInline onPress={onOpenMaps} />
        <CategoryOptions value={form.productCategories} onSelect={(value) => onChange('productCategories', value)} />
      </View>

      <SectionLabel
        icon="person-circle-outline"
        title="Người đại diện"
        subtitle="Thông tin giúp admin xác minh người quản lý cửa hàng."
      />
      <View style={styles.formSection}>
        <RegistrationField
          label="Người đại diện"
          required
          icon="person-outline"
          value={form.representativeName}
          onChangeText={(value) => onChange('representativeName', value)}
          placeholder="Ví dụ: Nguyễn Văn A"
        />
        <RegistrationField
          label="Vai trò"
          required
          icon="id-card-outline"
          value={form.representativeRole}
          onChangeText={(value) => onChange('representativeRole', value)}
          placeholder="Ví dụ: Chủ cửa hàng, quản lý chi nhánh"
        />
        <RegistrationField
          label="Khu vực phục vụ"
          required
          icon="map-outline"
          value={form.serviceArea}
          onChangeText={(value) => onChange('serviceArea', value)}
          placeholder="Ví dụ: Củ Chi, Hóc Môn, Bình Chánh"
        />
        <RegistrationField
          label="Sản phẩm chính"
          required
          icon="leaf-outline"
          value={form.mainProducts}
          onChangeText={(value) => onChange('mainProducts', value)}
          placeholder="Ví dụ: phân bón hữu cơ, thuốc sinh học, hạt giống"
          multiline
        />
      </View>

      <SectionLabel
        icon="call-outline"
        title="Thông tin liên hệ"
        subtitle="Dùng để Leaf AI và khách hàng tiềm năng liên hệ."
      />
      <View style={styles.formSection}>
        <RegistrationField
          label="Email liên hệ"
          required
          icon="mail-outline"
          value={form.contactEmail}
          onChangeText={(value) => onChange('contactEmail', value)}
          placeholder="email@cuahang.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError ? 'Email không hợp lệ' : undefined}
        />
        <RegistrationField
          label="Số điện thoại"
          required
          icon="call-outline"
          value={form.phone}
          onChangeText={(value) => onChange('phone', value)}
          placeholder="Ví dụ: 0385095988"
          keyboardType="phone-pad"
          error={phoneError ? 'Số điện thoại không hợp lệ' : undefined}
        />
        <RegistrationField
          label="Website"
          optional
          icon="globe-outline"
          value={form.websiteUrl}
          onChangeText={(value) => onChange('websiteUrl', value)}
          placeholder="https://cuahangcuaban.vn"
          autoCapitalize="none"
        />
        <RegistrationField
          label="Link liên hệ / Zalo"
          optional
          icon="chatbubble-ellipses-outline"
          value={form.contactUrl}
          onChangeText={(value) => onChange('contactUrl', value)}
          placeholder="Dán link Zalo OA hoặc link liên hệ"
          helper="Link này có thể dùng khi nông dân muốn hỏi thêm về sản phẩm được gợi ý."
          autoCapitalize="none"
        />
      </View>

      <SectionLabel
        icon="document-text-outline"
        title="Xác minh đối tác"
        subtitle="Tài liệu giúp hồ sơ được duyệt nhanh hơn."
      />
      <View style={styles.formSection}>
        <RegistrationField
          label="Mã số thuế / Giấy phép kinh doanh"
          required
          icon="business-outline"
          value={form.businessLicense}
          onChangeText={(value) => onChange('businessLicense', value)}
          placeholder="Nhập mã số thuế hoặc số giấy phép"
        />
        <DocumentUploadCard
          title="Ảnh cửa hàng"
          required
          icon="camera-outline"
          selectedLabel={storePhotoUri ? 'Đã chọn ảnh cửa hàng' : 'Chưa chọn ảnh cửa hàng'}
          helper="Ảnh mặt tiền, quầy tư vấn hoặc kệ sản phẩm đại diện."
          fileHint="JPG, PNG, WEBP"
          previewUri={storePhotoUri}
          onPress={onPickStorePhoto}
        />
        <DocumentUploadCard
          title="Giấy phép kinh doanh"
          required
          icon="document-attach-outline"
          selectedLabel={licenseFileName || 'Chưa chọn file giấy phép'}
          helper="Tải giấy phép kinh doanh, mã số thuế hoặc tài liệu xác minh cửa hàng."
          fileHint="PDF, JPG, PNG, WEBP"
          onPress={onPickBusinessLicense}
        />
        <LogoUploadCard logoUri={logoUri} onPress={onPickLogo} />
        <CommitmentCard
          checked={form.advertisingCommitmentAccepted}
          onPress={() => onChange('advertisingCommitmentAccepted', !form.advertisingCommitmentAccepted)}
        />
        <Text style={styles.helperText}>Ảnh rõ ràng giúp Leaf AI xác minh hồ sơ và tăng độ tin cậy khi hiển thị đối tác.</Text>
      </View>

      {!canSubmit && (
        <Text style={styles.formHint}>Điền đủ các mục có dấu *, chọn ảnh cửa hàng, file giấy phép và xác nhận cam kết để gửi hồ sơ.</Text>
      )}
      {saving && <Text style={styles.formHint}>Đang gửi hồ sơ xét duyệt...</Text>}
    </>
  );
}

function ProgressCard() {
  const steps = [
    ['1', 'Bước 1', 'Thông tin cửa hàng'],
    ['2', 'Bước 2', 'Xác minh'],
    ['3', 'Bước 3', 'Hoàn tất'],
  ];
  return (
    <View style={styles.progressCard}>
      <View style={styles.stepsRow}>
        {steps.map(([index, title, text], stepIndex) => (
          <View key={index} style={styles.stepItem}>
            <View style={[styles.stepIndex, stepIndex === 0 && styles.stepIndexActive]}>
              <Text style={[styles.stepIndexText, stepIndex === 0 && styles.stepIndexTextActive]}>{index}</Text>
            </View>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.stepText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReviewInfoCard() {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewIcon}>
        <Ionicons name="shield-checkmark-outline" size={22} color={GREEN} />
      </View>
      <View style={styles.fill}>
        <Text style={styles.reviewTitle}>Hồ sơ của bạn sẽ được Leaf AI xét duyệt trước khi hiển thị sản phẩm.</Text>
        <Text style={styles.reviewText}>Thông tin rõ ràng giúp sản phẩm vật tư được gợi ý đáng tin cậy hơn sau khi người dùng quét bệnh lá cây.</Text>
      </View>
    </View>
  );
}

function SectionLabel({ icon, title, subtitle }: { icon: IconName; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionLabelIcon}>
        <Ionicons name={icon} size={21} color={GREEN} />
      </View>
      <View style={styles.fill}>
        <Text style={styles.sectionLabelTitle}>{title}</Text>
        <Text style={styles.sectionLabelText}>{subtitle}</Text>
      </View>
    </View>
  );
}

function RegistrationField(
  props: React.ComponentProps<typeof TextInput> & {
    label: string;
    icon: IconName;
    required?: boolean;
    optional?: boolean;
    helper?: string;
    error?: string;
  }
) {
  const { label, icon, required, optional, helper, error, style, ...rest } = props;
  return (
    <View style={styles.registrationField}>
      <View style={styles.registrationFieldHead}>
        <Text style={styles.registrationLabel}>
          {label} {required && <Text style={styles.requiredText}>*</Text>}
        </Text>
        {optional && <Text style={styles.optionalText}>Không bắt buộc</Text>}
      </View>
      <View style={[styles.registrationControl, !!error && styles.registrationControlError]}>
        <Ionicons name={icon} size={18} color="#839083" style={styles.registrationInputIcon} />
        <TextInput
          placeholderTextColor="#9AA79B"
          style={[styles.registrationInput, rest.multiline && styles.registrationTextarea, style]}
          {...rest}
        />
      </View>
      {!!helper && <Text style={styles.helperText}>{helper}</Text>}
      {!!error && <Text style={styles.registrationError}>{error}</Text>}
    </View>
  );
}

function MapInline({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.mapInline}>
      <Text style={styles.mapInlineText}>Kiểm tra vị trí giúp Leaf AI hiển thị địa chỉ cửa hàng rõ ràng hơn.</Text>
      <Pressable onPress={onPress} style={styles.mapButton}>
        <Ionicons name="map-outline" size={15} color={GREEN} />
        <Text style={styles.mapButtonText}>Mở bản đồ</Text>
      </Pressable>
    </View>
  );
}

function CategoryOptions({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  return (
    <View style={styles.registrationField}>
      <View style={styles.registrationFieldHead}>
        <Text style={styles.registrationLabel}>Nhóm sản phẩm <Text style={styles.requiredText}>*</Text></Text>
      </View>
      <View style={styles.categoryGrid}>
        {CATEGORY_OPTIONS.map((option) => {
          const active = value === option;
          return (
            <Pressable key={option} onPress={() => onSelect(option)} style={[styles.categoryChip, active && styles.categoryChipActive]}>
              <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LogoUploadCard({ logoUri, onPress }: { logoUri: string | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.uploadCard, !!logoUri && styles.uploadCardActive]}>
      {logoUri ? (
        <Image source={{ uri: logoUri }} style={styles.uploadPreview as any} />
      ) : (
        <View style={styles.uploadIcon}>
          <Ionicons name="image-outline" size={22} color={GREEN} />
        </View>
      )}
      <View style={styles.fill}>
        <Text style={styles.uploadTitle}>Logo cửa hàng</Text>
        <Text style={styles.uploadText}>{logoUri ? 'Đã chọn logo, sẽ upload sau khi gửi hồ sơ.' : 'Không bắt buộc, có thể bỏ qua.'}</Text>
        <View style={styles.uploadMeta}>
          <Text style={[styles.pill, !!logoUri && styles.pillSuccess]}>{logoUri ? 'Đã chọn' : 'Chưa chọn'}</Text>
          <Text style={styles.pill}>JPG, PNG</Text>
          <Text style={styles.pill}>Tối đa 10MB</Text>
        </View>
      </View>
    </Pressable>
  );
}

function DocumentUploadCard({
  title,
  required,
  icon,
  selectedLabel,
  helper,
  fileHint,
  previewUri,
  onPress,
}: {
  title: string;
  required?: boolean;
  icon: IconName;
  selectedLabel: string;
  helper: string;
  fileHint: string;
  previewUri?: string | null;
  onPress: () => void;
}) {
  const selected = Boolean(previewUri || (selectedLabel && !selectedLabel.startsWith('Chưa chọn')));
  return (
    <Pressable onPress={onPress} style={[styles.uploadCard, selected && styles.uploadCardActive]}>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.uploadPreview as any} />
      ) : (
        <View style={styles.uploadIcon}>
          <Ionicons name={icon} size={22} color={GREEN} />
        </View>
      )}
      <View style={styles.fill}>
        <Text style={styles.uploadTitle}>
          {title} {required && <Text style={styles.requiredText}>*</Text>}
        </Text>
        <Text style={styles.uploadText}>{helper}</Text>
        <View style={styles.uploadMeta}>
          <Text style={[styles.pill, selected && styles.pillSuccess]}>{selectedLabel}</Text>
          <Text style={styles.pill}>{fileHint}</Text>
          <Text style={styles.pill}>Tối đa 10MB</Text>
        </View>
      </View>
    </Pressable>
  );
}

function CommitmentCard({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.commitmentCard, checked && styles.commitmentCardActive]}>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
        {checked && <Ionicons name="checkmark-outline" size={15} color={CARD} />}
      </View>
      <View style={styles.fill}>
        <Text style={styles.commitmentTitle}>Cam kết nội dung quảng cáo <Text style={styles.requiredText}>*</Text></Text>
        <Text style={styles.commitmentText}>Tôi xác nhận thông tin cửa hàng, giấy phép và sản phẩm quảng cáo là đúng sự thật, không gây hiểu nhầm cho người dùng Leaf AI.</Text>
      </View>
    </Pressable>
  );
}

function IntroCard({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroIcon}>
        <Ionicons name={icon} size={24} color={GREEN} />
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroText}>{text}</Text>
    </View>
  );
}

function PartnerOverview({
  partner,
  initials,
  productCount,
  activeCount,
}: {
  partner: PartnerStore;
  initials: string;
  productCount: number;
  activeCount: number;
}) {
  return (
    <View style={styles.overviewCard}>
      <View style={styles.overviewTop}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={styles.fill}>
          <View style={styles.badgeRow}>
            <Badge label={partnerStatusLabel(partner.status)} tone={partner.status === 'active' ? 'success' : partner.status === 'rejected' ? 'danger' : 'warning'} />
            {!!partner.activeMembership && <Badge label="Gói đang hoạt động" tone="info" />}
          </View>
          <Text style={styles.partnerName}>{partner.storeName || partner.companyName}</Text>
          {!!partner.description && <Text style={styles.mutedText}>{partner.description}</Text>}
        </View>
      </View>
      <View style={styles.metricsRow}>
        <Metric icon="cube-outline" value={String(productCount)} label="sản phẩm đã tạo" />
        <Metric icon="checkmark-circle-outline" value={String(activeCount)} label="đang active" />
      </View>
    </View>
  );
}

function TabPills({ activeTab, onChange }: { activeTab: PartnerTab; onChange: (tab: PartnerTab) => void }) {
  const tabs: Array<{ id: PartnerTab; label: string; icon: IconName }> = [
    { id: 'profile', label: 'Hồ sơ', icon: 'business-outline' },
    { id: 'products', label: 'Sản phẩm', icon: 'cube-outline' },
  ];
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={[styles.tabButton, active && styles.tabButtonActive]}>
            <Ionicons name={tab.icon} size={16} color={active ? CARD : MUTED} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatusCard({ partner }: { partner: PartnerStore }) {
  let icon: IconName = 'time-outline';
  let title = 'Hồ sơ đang chờ duyệt';
  let text = 'Admin cần duyệt hồ sơ trước khi bạn thanh toán và đăng sản phẩm.';
  let tone: 'success' | 'warning' | 'danger' = 'warning';

  if (partner.status === 'active') {
    icon = 'shield-checkmark-outline';
    title = 'Hồ sơ đã được duyệt';
    text = partner.activeMembership
      ? 'Gói đối tác đang hoạt động. Sản phẩm đã duyệt sẽ được hiển thị trong marketplace.'
      : 'Bạn cần thanh toán gói đối tác để đăng và hiển thị sản phẩm.';
    tone = 'success';
  } else if (partner.status === 'rejected') {
    icon = 'alert-circle-outline';
    title = 'Hồ sơ bị từ chối';
    text = partner.rejectionReason || 'Vui lòng cập nhật lại thông tin hồ sơ và gửi admin duyệt lại.';
    tone = 'danger';
  } else if (partner.status === 'suspended') {
    icon = 'pause-circle-outline';
    title = 'Hồ sơ đang tạm khóa';
    text = 'Cửa hàng đang bị tạm khóa, sản phẩm sẽ không hiển thị public.';
    tone = 'danger';
  }

  return (
    <View style={[styles.statusCard, styles[`${tone}Card`]]}>
      <Ionicons name={icon} size={22} color={tone === 'success' ? GREEN : tone === 'danger' ? theme.colors.severe : ORANGE} />
      <View style={styles.fill}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusText}>{text}</Text>
      </View>
    </View>
  );
}

function PartnerDocumentsCard({
  partner,
  saving,
  onUploadCover,
  onUploadBusinessLicense,
}: {
  partner: PartnerStore;
  saving: boolean;
  onUploadCover: () => void;
  onUploadBusinessLicense: () => void;
}) {
  const openLicense = () => {
    if (!partner.businessLicenseFileUrl) return;
    Linking.openURL(partner.businessLicenseFileUrl).catch(() => {
      Alert.alert('Không mở được file', 'Vui lòng thử tải lại giấy phép kinh doanh.');
    });
  };

  return (
    <View style={styles.card}>
      <SectionTitle title="Tài liệu xét duyệt" subtitle="Ảnh cửa hàng và giấy phép kinh doanh là bắt buộc trước khi admin duyệt hồ sơ." />
      <View style={styles.documentRow}>
        {partner.coverUrl ? (
          <Image source={{ uri: partner.coverUrl }} style={styles.documentPreview as any} />
        ) : (
          <View style={styles.documentIcon}><Ionicons name="camera-outline" size={20} color={ORANGE} /></View>
        )}
        <View style={styles.fill}>
          <Text style={styles.documentTitle}>Ảnh cửa hàng</Text>
          <Badge label={partner.coverUrl ? 'Đã có ảnh' : 'Thiếu ảnh'} tone={partner.coverUrl ? 'success' : 'warning'} />
        </View>
        <Pressable disabled={saving} onPress={onUploadCover} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{partner.coverUrl ? 'Đổi ảnh' : 'Upload'}</Text>
        </Pressable>
      </View>

      <View style={styles.documentRow}>
        <View style={styles.documentIcon}>
          <Ionicons name="document-attach-outline" size={20} color={partner.businessLicenseFileUrl ? GREEN : ORANGE} />
        </View>
        <View style={styles.fill}>
          <Text style={styles.documentTitle}>Giấy phép kinh doanh</Text>
          <Badge label={partner.businessLicenseFileUrl ? 'Đã có file' : 'Thiếu file'} tone={partner.businessLicenseFileUrl ? 'success' : 'warning'} />
        </View>
        {partner.businessLicenseFileUrl && (
          <Pressable disabled={saving} onPress={openLicense} style={styles.lightButton}>
            <Text style={styles.lightButtonText}>Xem</Text>
          </Pressable>
        )}
        <Pressable disabled={saving} onPress={onUploadBusinessLicense} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{partner.businessLicenseFileUrl ? 'Đổi file' : 'Upload'}</Text>
        </Pressable>
      </View>

      <View style={styles.documentRow}>
        <View style={styles.documentIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color={partner.advertisingCommitmentAccepted ? GREEN : ORANGE} />
        </View>
        <View style={styles.fill}>
          <Text style={styles.documentTitle}>Cam kết quảng cáo</Text>
          <Badge label={partner.advertisingCommitmentAccepted ? 'Đã xác nhận' : 'Chưa xác nhận'} tone={partner.advertisingCommitmentAccepted ? 'success' : 'warning'} />
        </View>
      </View>
    </View>
  );
}

function PartnerForm({
  mode,
  form,
  saving,
  onChange,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  form: PartnerFormState;
  saving: boolean;
  onChange: (field: keyof PartnerFormState, value: string | boolean) => void;
  onSubmit: () => void;
}) {
  const isEdit = mode === 'edit';
  return (
    <View style={styles.card}>
      <SectionTitle
        title={isEdit ? 'Hồ sơ cửa hàng' : 'Thông tin đăng ký'}
        subtitle={isEdit ? 'Cập nhật thông tin public của cửa hàng.' : 'Thông tin này dùng để admin duyệt kênh đối tác.'}
      />
      <Field label="Tên công ty" value={form.companyName} onChangeText={(value) => onChange('companyName', value)} />
      <Field label="Tên cửa hàng hiển thị" value={form.storeName} onChangeText={(value) => onChange('storeName', value)} />
      <Field label="Mô tả cửa hàng" value={form.description} onChangeText={(value) => onChange('description', value)} multiline />
      <Field label="Địa chỉ" value={form.address} onChangeText={(value) => onChange('address', value)} />
      <Field label="Email liên hệ" value={form.contactEmail} onChangeText={(value) => onChange('contactEmail', value)} editable={!isEdit} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Số điện thoại" value={form.phone} onChangeText={(value) => onChange('phone', value)} keyboardType="phone-pad" />
      <Field label="Người đại diện" value={form.representativeName} onChangeText={(value) => onChange('representativeName', value)} />
      <Field label="Vai trò" value={form.representativeRole} onChangeText={(value) => onChange('representativeRole', value)} />
      <Field label="Khu vực phục vụ" value={form.serviceArea} onChangeText={(value) => onChange('serviceArea', value)} />
      <Field label="Sản phẩm chính" value={form.mainProducts} onChangeText={(value) => onChange('mainProducts', value)} multiline />
      <Field label="Mã số thuế / giấy phép kinh doanh" value={form.businessLicense} onChangeText={(value) => onChange('businessLicense', value)} />
      <Field label="Nhóm sản phẩm" value={form.productCategories} onChangeText={(value) => onChange('productCategories', value)} />
      <Field label="Website" value={form.websiteUrl} onChangeText={(value) => onChange('websiteUrl', value)} autoCapitalize="none" />
      <Field label="Link liên hệ / Zalo" value={form.contactUrl} onChangeText={(value) => onChange('contactUrl', value)} autoCapitalize="none" />
      <CommitmentCard
        checked={form.advertisingCommitmentAccepted}
        onPress={() => onChange('advertisingCommitmentAccepted', !form.advertisingCommitmentAccepted)}
      />
      <Pressable disabled={saving} onPress={onSubmit} style={[styles.primaryButton, saving && styles.disabled]}>
        <Text style={styles.primaryButtonText}>{saving ? 'Đang lưu...' : isEdit ? 'Lưu hồ sơ' : 'Gửi hồ sơ duyệt'}</Text>
      </Pressable>
    </View>
  );
}

function PaymentCard({
  saving,
  payingPlan,
  onPay,
}: {
  saving: boolean;
  payingPlan: PartnerPlanType | null;
  onPay: (planType: PartnerPlanType) => void;
}) {
  return (
    <View style={styles.card}>
      <SectionTitle title="Chọn gói quảng cáo" subtitle="Sau khi thanh toán, shop và tối đa 20 sản phẩm active có thể hiển thị public nếu đã được duyệt." />
      <PlanButtons saving={saving} payingPlan={payingPlan} onPay={onPay} />
    </View>
  );
}

function MembershipCard({ partner }: { partner: PartnerStore }) {
  const membership = partner.activeMembership;
  if (!membership) return null;
  const planName = membership.durationDays >= 365 ? 'Gói năm' : 'Gói tháng';
  return (
    <View style={styles.card}>
      <SectionTitle title="Gói đang hoạt động" subtitle={planName} />
      <View style={styles.infoRow}>
        <InfoItem icon="calendar-outline" label="Hết hạn" value={formatDate(membership.expiresAt)} />
        <InfoItem icon="cube-outline" label="Giới hạn active" value={`${membership.maxActiveProducts} sản phẩm`} />
      </View>
    </View>
  );
}

function ProductAccessCard({
  partner,
  canManageProducts,
  onPay,
  saving,
  payingPlan,
}: {
  partner: PartnerStore;
  canManageProducts: boolean;
  onPay: (planType: PartnerPlanType) => void;
  saving: boolean;
  payingPlan: PartnerPlanType | null;
}) {
  if (canManageProducts) {
    return (
      <View style={styles.statusCard}>
        <Ionicons name="checkmark-circle-outline" size={22} color={GREEN} />
        <View style={styles.fill}>
          <Text style={styles.statusTitle}>Có thể quản lý sản phẩm</Text>
          <Text style={styles.statusText}>Sản phẩm mới hoặc nội dung sửa đổi sẽ cần admin duyệt trước khi public.</Text>
        </View>
      </View>
    );
  }

  const needsApproval = partner.status !== 'active';
  return (
    <View style={[styles.statusCard, styles.warningCard]}>
      <Ionicons name={needsApproval ? 'time-outline' : 'card-outline'} size={22} color={ORANGE} />
      <View style={styles.fill}>
        <Text style={styles.statusTitle}>{needsApproval ? 'Chưa thể đăng sản phẩm' : 'Cần thanh toán gói đối tác'}</Text>
        <Text style={styles.statusText}>
          {needsApproval
            ? 'Hồ sơ cửa hàng cần được admin duyệt trước khi tạo sản phẩm.'
            : 'Chọn gói tháng hoặc gói năm để đăng tối đa 20 sản phẩm active.'}
        </Text>
        {!needsApproval && (
          <PlanButtons compact saving={saving} payingPlan={payingPlan} onPay={onPay} />
        )}
      </View>
    </View>
  );
}

function PlanButtons({
  saving,
  payingPlan,
  onPay,
  compact,
}: {
  saving: boolean;
  payingPlan: PartnerPlanType | null;
  onPay: (planType: PartnerPlanType) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.planList, compact && styles.planListCompact]}>
      {PARTNER_PLANS.map((plan) => {
        const isPayingThisPlan = saving && payingPlan === plan.type;
        return (
          <Pressable
            key={plan.type}
            disabled={saving}
            onPress={() => onPay(plan.type)}
            style={[styles.planCard, compact && styles.planCardCompact, saving && styles.disabled]}
          >
            <View style={styles.planTop}>
              <View style={styles.planIcon}>
                <Ionicons name={plan.type === 'yearly' ? 'ribbon-outline' : 'calendar-outline'} size={18} color={GREEN} />
              </View>
              <View style={styles.fill}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planNote}>{plan.duration} · {plan.note}</Text>
              </View>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </View>
            <View style={styles.planPayRow}>
              <Ionicons name="card-outline" size={15} color={CARD} />
              <Text style={styles.planPayText}>{isPayingThisPlan ? 'Đang tạo thanh toán...' : 'Thanh toán VNPAY'}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProductForm({
  form,
  editingProduct,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: ProductFormState;
  editingProduct: PartnerProduct | null;
  saving: boolean;
  onChange: (field: keyof ProductFormState, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.card}>
      <SectionTitle
        title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        subtitle="Gắn disease key hoặc nhóm cây để sản phẩm được gợi ý đúng sau khi quét bệnh."
      />
      <Field label="Tên sản phẩm" value={form.name} onChangeText={(value) => onChange('name', value)} />
      <Field label="Mô tả" value={form.description} onChangeText={(value) => onChange('description', value)} multiline />
      <Field label="Khoảng giá" value={form.priceRange} onChangeText={(value) => onChange('priceRange', value)} />
      <Field label="Link liên hệ / mua" value={form.productUrl} onChangeText={(value) => onChange('productUrl', value)} autoCapitalize="none" />
      <Field label="Disease key liên quan" value={form.targetDiseases} onChangeText={(value) => onChange('targetDiseases', value)} />
      <Field label="Nhóm cây liên quan" value={form.targetCategories} onChangeText={(value) => onChange('targetCategories', value)} />
      <View style={styles.buttonRow}>
        <Pressable disabled={saving} onPress={onSubmit} style={[styles.primaryButton, saving && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{saving ? 'Đang lưu...' : editingProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</Text>
        </Pressable>
        {editingProduct && (
          <Pressable disabled={saving} onPress={onCancel} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Hủy</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ProductList({
  products,
  saving,
  onEdit,
  onToggle,
  onDelete,
  onUploadImage,
}: {
  products: PartnerProduct[];
  saving: boolean;
  onEdit: (product: PartnerProduct) => void;
  onToggle: (product: PartnerProduct) => void;
  onDelete: (product: PartnerProduct) => void;
  onUploadImage: (product: PartnerProduct) => void;
}) {
  return (
    <View style={styles.card}>
      <SectionTitle title="Sản phẩm của cửa hàng" subtitle={`${products.length} sản phẩm`} />
      {products.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có sản phẩm.</Text>
      ) : (
        products.map((product) => (
          <View key={product.id} style={styles.productRow}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.productImage as any} />
            ) : (
              <View style={styles.productImageFallback}>
                <Ionicons name="leaf-outline" size={20} color={MUTED} />
              </View>
            )}
            <View style={styles.fill}>
              <View style={styles.productTitleRow}>
                <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
                <Badge label={product.isActive ? 'Active' : 'Ẩn'} tone={product.isActive ? 'success' : 'muted'} />
              </View>
              <Text style={styles.productMeta}>{productStatusLabel(product.moderationStatus)}</Text>
              {!!product.rejectionReason && <Text style={styles.rejectReason}>{product.rejectionReason}</Text>}
              {!!product.priceRange && <Text style={styles.productMeta}>{product.priceRange}</Text>}
              <View style={styles.iconActionRow}>
                <IconAction disabled={saving} icon="create-outline" label="Sửa" onPress={() => onEdit(product)} />
                <IconAction disabled={saving} icon="image-outline" label="Ảnh" onPress={() => onUploadImage(product)} />
                <IconAction disabled={saving} icon={product.isActive ? 'pause-circle-outline' : 'play-circle-outline'} label={product.isActive ? 'Ẩn' : 'Bật'} onPress={() => onToggle(product)} />
                <IconAction disabled={saving} icon="trash-outline" label="Xóa" danger onPress={() => onDelete(product)} />
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, editable = true, ...rest } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        editable={editable}
        style={[
          styles.input,
          rest.multiline && styles.inputMultiline,
          !editable && styles.inputDisabled,
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

function Metric({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={17} color={GREEN} />
      <View style={styles.fill}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function InfoItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={17} color={GREEN} />
      <View style={styles.fill}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'muted' }) {
  const color =
    tone === 'success' ? GREEN :
      tone === 'danger' ? theme.colors.severe :
        tone === 'info' ? BLUE :
          tone === 'muted' ? MUTED :
            ORANGE;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}16` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  const color = danger ? theme.colors.severe : GREEN;
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.iconAction, disabled && styles.disabled]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.iconActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900', color: TEXT },
  content: { padding: 18, paddingBottom: 42 },
  registrationContent: { paddingHorizontal: 18, paddingTop: 0, paddingBottom: 128 },
  registrationIntro: { paddingTop: 14, paddingBottom: 10 },
  registrationSubtitle: { color: MUTED, fontSize: 13, lineHeight: 19, textAlign: 'center', fontWeight: '700' },
  progressCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(38,118,64,0.09)',
    padding: 14,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  stepsRow: { flexDirection: 'row', gap: 8 },
  stepItem: { flex: 1, minWidth: 0 },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexActive: { backgroundColor: GREEN },
  stepIndexText: { color: MUTED, fontSize: 12, fontWeight: '900' },
  stepIndexTextActive: { color: CARD },
  stepTitle: { marginTop: 8, color: TEXT, fontSize: 11, lineHeight: 14, fontWeight: '900' },
  stepText: { marginTop: 3, color: MUTED, fontSize: 10, lineHeight: 13, fontWeight: '700' },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EAF8EE',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(38,118,64,0.09)',
    padding: 14,
    marginBottom: 4,
    ...theme.shadows.card,
  },
  reviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitle: { color: TEXT, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  reviewText: { marginTop: 5, color: MUTED, fontSize: 12, lineHeight: 17 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 10 },
  sectionLabelIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#EAF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabelTitle: { color: TEXT, fontSize: 17, lineHeight: 21, fontWeight: '900' },
  sectionLabelText: { marginTop: 3, color: MUTED, fontSize: 11, lineHeight: 15 },
  formSection: {
    backgroundColor: CARD,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(38,118,64,0.09)',
    padding: 14,
    ...theme.shadows.card,
  },
  registrationField: { marginTop: 14 },
  registrationFieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 },
  registrationLabel: { color: '#545B58', fontSize: 12, lineHeight: 15, fontWeight: '900' },
  requiredText: { color: theme.colors.severe },
  optionalText: { color: MUTED, fontSize: 11, fontWeight: '800' },
  registrationControl: {
    minHeight: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(38,118,64,0.13)',
    backgroundColor: '#FEFFFE',
    justifyContent: 'center',
  },
  registrationControlError: { borderColor: 'rgba(192,65,50,0.42)', backgroundColor: '#FFF7F6' },
  registrationInputIcon: { position: 'absolute', left: 13, top: 16 },
  registrationInput: {
    minHeight: 52,
    paddingLeft: 42,
    paddingRight: 14,
    color: TEXT,
    fontSize: 14,
    lineHeight: 19,
  },
  registrationTextarea: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  helperText: { marginTop: 7, marginHorizontal: 2, color: MUTED, fontSize: 11, lineHeight: 15 },
  registrationError: { marginTop: 7, marginHorizontal: 2, color: theme.colors.severe, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  mapInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 9,
    padding: 9,
    borderRadius: 16,
    backgroundColor: '#F0F5F0',
  },
  mapInlineText: { flex: 1, color: MUTED, fontSize: 11, lineHeight: 15 },
  mapButton: {
    minHeight: 34,
    borderRadius: 13,
    paddingHorizontal: 11,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(38,118,64,0.09)',
  },
  mapButtonText: { color: GREEN, fontSize: 12, fontWeight: '900' },
  categoryGrid: { gap: 8 },
  categoryChip: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(38,118,64,0.13)',
    backgroundColor: '#FEFFFE',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: { backgroundColor: '#EAF8EE', borderColor: 'rgba(38,118,64,0.28)' },
  categoryChipText: { color: MUTED, fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  categoryChipTextActive: { color: GREEN, fontWeight: '900' },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(38,118,64,0.09)',
    backgroundColor: CARD,
    padding: 13,
    marginTop: 12,
  },
  uploadCardActive: { borderColor: 'rgba(38,118,64,0.18)', backgroundColor: '#F7FBF8' },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EAF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPreview: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#EAF8EE' },
  uploadTitle: { color: TEXT, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  uploadText: { marginTop: 5, color: MUTED, fontSize: 11, lineHeight: 15 },
  uploadMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  pill: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F0F5F0',
    color: MUTED,
    fontSize: 10,
    lineHeight: 24,
    fontWeight: '900',
  },
  pillSuccess: { backgroundColor: '#EAF8EE', color: GREEN },
  commitmentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(38,118,64,0.13)',
    backgroundColor: '#FEFFFE',
    padding: 12,
    marginTop: 12,
  },
  commitmentCardActive: { borderColor: '#CDEBD4', backgroundColor: '#F4FBF6' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B9C8BA',
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: GREEN, borderColor: GREEN },
  commitmentTitle: { color: TEXT, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  commitmentText: { marginTop: 4, color: MUTED, fontSize: 11, lineHeight: 16 },
  formHint: { marginTop: 12, color: MUTED, textAlign: 'center', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  bottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38,118,64,0.08)',
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...theme.shadows.scanButton,
  },
  submitButtonDisabled: { backgroundColor: '#E1E7E1', shadowOpacity: 0, elevation: 0 },
  submitButtonText: { color: CARD, fontSize: 15, fontWeight: '900' },
  ctaNote: { marginTop: 8, color: MUTED, textAlign: 'center', fontSize: 11, lineHeight: 15 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 8, color: MUTED, fontSize: 14, textAlign: 'center' },
  errorText: { color: theme.colors.severe, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 14 },
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
    ...theme.shadows.card,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EAF8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 20, lineHeight: 26, fontWeight: '900', color: TEXT },
  heroText: { marginTop: 6, fontSize: 13, lineHeight: 20, color: MUTED },
  overviewCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  overviewTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: CARD, fontSize: 17, fontWeight: '900' },
  fill: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 5 },
  partnerName: { fontSize: 16, lineHeight: 21, fontWeight: '900', color: TEXT },
  mutedText: { marginTop: 3, fontSize: 12, lineHeight: 17, color: MUTED },
  metricsRow: { flexDirection: 'row', gap: 10, marginTop: 13 },
  metric: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: { fontSize: 16, lineHeight: 20, fontWeight: '900', color: TEXT },
  metricLabel: { fontSize: 10, lineHeight: 14, color: MUTED, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabButtonActive: { backgroundColor: GREEN, borderColor: GREEN },
  tabText: { fontSize: 12, fontWeight: '900', color: MUTED },
  tabTextActive: { color: CARD },
  card: {
    backgroundColor: CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  sectionTitleWrap: { marginBottom: 12 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: '900', color: TEXT },
  sectionSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, color: MUTED },
  fieldWrap: { marginBottom: 10 },
  fieldLabel: { marginBottom: 5, fontSize: 11, lineHeight: 14, fontWeight: '900', color: MUTED },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FBFDFB',
    paddingHorizontal: 12,
    color: TEXT,
    fontSize: 13,
  },
  inputMultiline: { minHeight: 82, paddingTop: 10, textAlignVertical: 'top' },
  inputDisabled: { color: MUTED, backgroundColor: '#F1F3F1' },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: GREEN,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: CARD, fontSize: 13, fontWeight: '900' },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CDEBD4',
    backgroundColor: '#F3FBF5',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  secondaryButtonText: { color: GREEN, fontSize: 12, fontWeight: '900' },
  lightButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightButtonText: { color: MUTED, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  statusCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 13,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  successCard: { backgroundColor: '#F4FBF6', borderColor: '#CDEBD4' },
  warningCard: { backgroundColor: '#FFF8EA', borderColor: '#FFE1A6' },
  dangerCard: { backgroundColor: '#FFF7F7', borderColor: '#F3CCCC' },
  statusTitle: { fontSize: 14, lineHeight: 18, fontWeight: '900', color: TEXT },
  statusText: { marginTop: 3, fontSize: 12, lineHeight: 17, color: MUTED },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#F1F3F1' },
  logoFallback: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#EAF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  documentPreview: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F1F3F1' },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTitle: { marginBottom: 6, color: TEXT, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoItem: {
    flex: 1,
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: { fontSize: 10, fontWeight: '800', color: MUTED },
  infoValue: { marginTop: 2, fontSize: 12, fontWeight: '900', color: TEXT },
  inlinePayButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  inlinePayText: { color: CARD, fontSize: 12, fontWeight: '900' },
  planList: { gap: 10 },
  planListCompact: { marginTop: 10 },
  planCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CDEBD4',
    backgroundColor: '#F7FBF8',
    padding: 12,
  },
  planCardCompact: {
    backgroundColor: CARD,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { fontSize: 14, lineHeight: 18, fontWeight: '900', color: TEXT },
  planNote: { marginTop: 2, fontSize: 11, lineHeight: 15, color: MUTED },
  planPrice: { fontSize: 14, lineHeight: 18, fontWeight: '900', color: GREEN },
  planPayRow: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: GREEN,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  planPayText: { color: CARD, fontSize: 12, fontWeight: '900' },
  buttonRow: { flexDirection: 'row', gap: 9 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  productImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#F1F3F1' },
  productImageFallback: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F1F3F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTitleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  productName: { flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '900', color: TEXT },
  productMeta: { marginTop: 3, fontSize: 11, lineHeight: 15, color: MUTED, fontWeight: '700' },
  rejectReason: { marginTop: 3, fontSize: 11, lineHeight: 15, color: theme.colors.severe, fontWeight: '700' },
  iconActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  iconAction: {
    minHeight: 30,
    borderRadius: 8,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionText: { fontSize: 11, fontWeight: '900' },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 19 },
  badge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '900' },
});
