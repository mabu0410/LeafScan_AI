import { PartnerMembership, PartnerProduct, PartnerStore, PaymentTransaction } from '../types';
import { requestJson } from './client';
import { toApiAssetUrl } from './config';

export interface PartnerRegistrationInput {
  companyName: string;
  storeName?: string;
  description?: string;
  address?: string;
  contactEmail: string;
  phone: string;
  businessLicense: string;
  representativeName: string;
  representativeRole: string;
  serviceArea: string;
  mainProducts: string;
  advertisingCommitmentAccepted: boolean;
  productCategories: string[];
  websiteUrl?: string;
  contactUrl?: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  imageUrl?: string;
  priceRange?: string;
  targetDiseases: string[];
  targetCategories: string[];
  productUrl?: string;
  isActive?: boolean;
}

export type PartnerPlanType = 'monthly' | 'yearly';

function mapMembership(raw: any): PartnerMembership | undefined {
  if (!raw) return undefined;
  return {
    id: String(raw.id),
    status: raw.status,
    priceVnd: Number(raw.price_vnd || 0),
    durationDays: Number(raw.duration_days || 0),
    maxActiveProducts: Number(raw.max_active_products || 0),
    startedAt: raw.started_at,
    expiresAt: raw.expires_at,
  };
}

export function mapPartner(raw: any): PartnerStore {
  return {
    id: String(raw.id),
    userId: raw.user_id == null ? undefined : String(raw.user_id),
    companyName: raw.company_name || '',
    storeName: raw.store_name || undefined,
    description: raw.description || undefined,
    address: raw.address || undefined,
    logoUrl: toApiAssetUrl(raw.logo_url),
    coverUrl: toApiAssetUrl(raw.cover_url),
    contactEmail: raw.contact_email || '',
    phone: raw.phone || '',
    businessLicense: raw.business_license || '',
    businessLicenseFileUrl: toApiAssetUrl(raw.business_license_file_url),
    representativeName: raw.representative_name || undefined,
    representativeRole: raw.representative_role || undefined,
    serviceArea: raw.service_area || undefined,
    mainProducts: raw.main_products || undefined,
    advertisingCommitmentAccepted: Boolean(raw.advertising_commitment_accepted),
    advertisingCommitmentAt: raw.advertising_commitment_at || undefined,
    productCategories: Array.isArray(raw.product_categories) ? raw.product_categories.map(String) : [],
    websiteUrl: raw.website_url || undefined,
    contactUrl: raw.contact_url || undefined,
    status: raw.status || 'pending_review',
    rejectionReason: raw.rejection_reason || undefined,
    activeMembership: mapMembership(raw.active_membership),
    activeProductCount: Number(raw.active_product_count || 0),
    createdAt: raw.created_at || '',
  };
}

export function mapProduct(raw: any): PartnerProduct {
  return {
    id: String(raw.id),
    partnerId: String(raw.partner_id),
    partnerName: raw.partner_name || undefined,
    partnerStatus: raw.partner_status || undefined,
    name: raw.name || '',
    description: raw.description || undefined,
    imageUrl: toApiAssetUrl(raw.image_url),
    priceRange: raw.price_range || undefined,
    targetDiseases: Array.isArray(raw.target_diseases) ? raw.target_diseases.map(String) : [],
    targetCategories: Array.isArray(raw.target_categories) ? raw.target_categories.map(String) : [],
    productUrl: raw.product_url || undefined,
    isActive: Boolean(raw.is_active),
    moderationStatus: raw.moderation_status || 'pending_review',
    rejectionReason: raw.rejection_reason || undefined,
    createdAt: raw.created_at || '',
  };
}

function mapPayment(raw: any): PaymentTransaction {
  return {
    id: String(raw.id),
    partnerId: String(raw.partner_id),
    provider: raw.provider || 'vnpay',
    txnRef: raw.txn_ref || '',
    amountVnd: Number(raw.amount_vnd || 0),
    status: raw.status || 'pending',
    paymentUrl: raw.payment_url || undefined,
    vnpTransactionNo: raw.vnp_transaction_no || undefined,
    providerResponseCode: raw.provider_response_code || undefined,
    providerTransactionStatus: raw.provider_transaction_status || undefined,
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
    paidAt: raw.paid_at || undefined,
  };
}

function partnerPayload(input: PartnerRegistrationInput) {
  return {
    company_name: input.companyName,
    store_name: input.storeName,
    description: input.description,
    address: input.address,
    contact_email: input.contactEmail,
    phone: input.phone,
    business_license: input.businessLicense,
    representative_name: input.representativeName,
    representative_role: input.representativeRole,
    service_area: input.serviceArea,
    main_products: input.mainProducts,
    advertising_commitment_accepted: input.advertisingCommitmentAccepted,
    product_categories: input.productCategories,
    website_url: input.websiteUrl,
    contact_url: input.contactUrl,
  };
}

function partialPartnerPayload(input: Partial<PartnerRegistrationInput>) {
  const payload: Record<string, unknown> = {};
  if (input.companyName !== undefined) payload.company_name = input.companyName;
  if (input.storeName !== undefined) payload.store_name = input.storeName;
  if (input.description !== undefined) payload.description = input.description;
  if (input.address !== undefined) payload.address = input.address;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.businessLicense !== undefined) payload.business_license = input.businessLicense;
  if (input.representativeName !== undefined) payload.representative_name = input.representativeName;
  if (input.representativeRole !== undefined) payload.representative_role = input.representativeRole;
  if (input.serviceArea !== undefined) payload.service_area = input.serviceArea;
  if (input.mainProducts !== undefined) payload.main_products = input.mainProducts;
  if (input.advertisingCommitmentAccepted !== undefined) payload.advertising_commitment_accepted = input.advertisingCommitmentAccepted;
  if (input.productCategories !== undefined) payload.product_categories = input.productCategories;
  if (input.websiteUrl !== undefined) payload.website_url = input.websiteUrl;
  if (input.contactUrl !== undefined) payload.contact_url = input.contactUrl;
  return payload;
}

function productPayload(input: ProductInput) {
  return {
    name: input.name,
    description: input.description,
    image_url: input.imageUrl,
    price_range: input.priceRange,
    target_diseases: input.targetDiseases,
    target_categories: input.targetCategories,
    product_url: input.productUrl,
    is_active: input.isActive,
  };
}

function partialProductPayload(input: Partial<ProductInput>) {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.imageUrl !== undefined) payload.image_url = input.imageUrl;
  if (input.priceRange !== undefined) payload.price_range = input.priceRange;
  if (input.targetDiseases !== undefined) payload.target_diseases = input.targetDiseases;
  if (input.targetCategories !== undefined) payload.target_categories = input.targetCategories;
  if (input.productUrl !== undefined) payload.product_url = input.productUrl;
  if (input.isActive !== undefined) payload.is_active = input.isActive;
  return payload;
}

export async function registerPartnerApi(token: string, input: PartnerRegistrationInput): Promise<PartnerStore> {
  const response = await requestJson<any>('/partners/register', {
    method: 'POST',
    token,
    body: partnerPayload(input),
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Đăng ký đại lý thất bại');
  return mapPartner(response.data);
}

export async function getMyPartnerApi(token: string): Promise<PartnerStore | null> {
  try {
    const response = await requestJson<any>('/partners/me', { token });
    if (!response.success || !response.data) throw new Error(response.message || 'Không lấy được hồ sơ đại lý');
    return mapPartner(response.data);
  } catch (error: any) {
    if (String(error?.message || '').includes('chưa đăng ký')) return null;
    throw error;
  }
}

export async function updateMyPartnerApi(token: string, input: Partial<PartnerRegistrationInput>): Promise<PartnerStore> {
  const response = await requestJson<any>('/partners/me', {
    method: 'PUT',
    token,
    body: partialPartnerPayload(input),
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Cập nhật đại lý thất bại');
  return mapPartner(response.data);
}

export async function uploadPartnerLogoApi(token: string, imageUri: string): Promise<PartnerStore> {
  const form = new FormData();
  form.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: `partner_logo_${Date.now()}.jpg`,
  } as any);
  const response = await requestJson<any>('/partners/me/logo', { method: 'POST', token, body: form });
  if (!response.success || !response.data) throw new Error(response.message || 'Upload logo thất bại');
  return mapPartner(response.data);
}

export async function uploadPartnerCoverApi(token: string, imageUri: string): Promise<PartnerStore> {
  const form = new FormData();
  form.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: `partner_cover_${Date.now()}.jpg`,
  } as any);
  const response = await requestJson<any>('/partners/me/cover', { method: 'POST', token, body: form });
  if (!response.success || !response.data) throw new Error(response.message || 'Upload ảnh cửa hàng thất bại');
  return mapPartner(response.data);
}

function guessMimeType(fileName?: string, fallback?: string): string {
  const clean = (fileName || '').toLowerCase();
  if (clean.endsWith('.pdf')) return 'application/pdf';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  return fallback || 'application/pdf';
}

export async function uploadPartnerBusinessLicenseApi(
  token: string,
  fileUri: string,
  fileName = `business_license_${Date.now()}.pdf`,
  mimeType?: string
): Promise<PartnerStore> {
  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    type: mimeType || guessMimeType(fileName),
    name: fileName,
  } as any);
  const response = await requestJson<any>('/partners/me/business-license', { method: 'POST', token, body: form });
  if (!response.success || !response.data) throw new Error(response.message || 'Upload giấy phép kinh doanh thất bại');
  return mapPartner(response.data);
}

export async function listMyProductsApi(token: string): Promise<PartnerProduct[]> {
  const response = await requestJson<any>('/partners/me/products', { token });
  if (!response.success) throw new Error(response.message || 'Không lấy được sản phẩm');
  return (response.data || []).map(mapProduct);
}

export async function createProductApi(token: string, input: ProductInput): Promise<PartnerProduct> {
  const response = await requestJson<any>('/partners/me/products', {
    method: 'POST',
    token,
    body: productPayload(input),
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Tạo sản phẩm thất bại');
  return mapProduct(response.data);
}

export async function updateProductApi(token: string, productId: string, input: Partial<ProductInput>): Promise<PartnerProduct> {
  const response = await requestJson<any>(`/partners/me/products/${productId}`, {
    method: 'PUT',
    token,
    body: partialProductPayload(input),
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Cập nhật sản phẩm thất bại');
  return mapProduct(response.data);
}

export async function deleteProductApi(token: string, productId: string): Promise<void> {
  const response = await requestJson<any>(`/partners/me/products/${productId}`, {
    method: 'DELETE',
    token,
  });
  if (!response.success) throw new Error(response.message || 'Xóa sản phẩm thất bại');
}

export async function uploadProductImageApi(token: string, productId: string, imageUri: string): Promise<PartnerProduct> {
  const form = new FormData();
  form.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: `partner_product_${Date.now()}.jpg`,
  } as any);
  const response = await requestJson<any>(`/partners/me/products/${productId}/image`, {
    method: 'POST',
    token,
    body: form,
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Upload ảnh thất bại');
  return mapProduct(response.data);
}

export async function listMarketplacePartnersApi(): Promise<PartnerStore[]> {
  const response = await requestJson<any>('/marketplace/partners');
  if (!response.success) throw new Error(response.message || 'Không tải được cửa hàng');
  return (response.data || []).map(mapPartner);
}

export async function getMarketplacePartnerApi(partnerId: string): Promise<PartnerStore> {
  const response = await requestJson<any>(`/marketplace/partners/${partnerId}`);
  if (!response.success || !response.data) throw new Error(response.message || 'Không tải được cửa hàng');
  return mapPartner(response.data);
}

export async function listMarketplaceProductsApi(params: {
  partnerId?: string;
  diseaseKey?: string;
  category?: string;
  q?: string;
} = {}): Promise<PartnerProduct[]> {
  const query = new URLSearchParams();
  if (params.partnerId) query.set('partner_id', params.partnerId);
  if (params.diseaseKey) query.set('disease_key', params.diseaseKey);
  if (params.category) query.set('category', params.category);
  if (params.q) query.set('q', params.q);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await requestJson<any>(`/marketplace/products${suffix}`);
  if (!response.success) throw new Error(response.message || 'Không tải được sản phẩm');
  return (response.data || []).map(mapProduct);
}

export async function trackProductClickApi(token: string, productId: string): Promise<void> {
  await requestJson<any>(`/marketplace/products/${productId}/click`, { method: 'POST', token });
}

export async function createVnpayPartnerPaymentApi(
  token: string,
  planType: PartnerPlanType = 'monthly'
): Promise<{
  txnRef: string;
  amountVnd: number;
  paymentUrl: string;
  status: string;
  planType: PartnerPlanType;
  durationDays: number;
  maxActiveProducts: number;
}> {
  const response = await requestJson<any>('/partner-payments/vnpay/create', {
    method: 'POST',
    token,
    body: { plan_type: planType },
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Không tạo được thanh toán');
  return {
    txnRef: response.data.txn_ref,
    amountVnd: Number(response.data.amount_vnd || 0),
    paymentUrl: response.data.payment_url,
    status: response.data.status,
    planType: response.data.plan_type || planType,
    durationDays: Number(response.data.duration_days || 0),
    maxActiveProducts: Number(response.data.max_active_products || 0),
  };
}

export async function getPaymentStatusApi(token: string, txnRef: string): Promise<PaymentTransaction> {
  const response = await requestJson<any>(`/partner-payments/status/${txnRef}`, { token });
  if (!response.success || !response.data) throw new Error(response.message || 'Không kiểm tra được giao dịch');
  return mapPayment(response.data);
}

export async function adminListPartnersApi(token: string, status = 'pending_review'): Promise<PartnerStore[]> {
  const response = await requestJson<any>(`/admin/partners?status=${encodeURIComponent(status)}`, { token });
  if (!response.success) throw new Error(response.message || 'Không tải được đại lý chờ duyệt');
  return (response.data || []).map(mapPartner);
}

export async function adminUpdatePartnerStatusApi(token: string, partnerId: string, status: string, rejectionReason?: string): Promise<PartnerStore> {
  const response = await requestJson<any>(`/admin/partners/${partnerId}/status`, {
    method: 'PATCH',
    token,
    body: { status, rejection_reason: rejectionReason },
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Cập nhật đại lý thất bại');
  return mapPartner(response.data);
}

export async function adminListProductsApi(token: string, status = 'pending_review'): Promise<PartnerProduct[]> {
  const response = await requestJson<any>(`/admin/products?status=${encodeURIComponent(status)}`, { token });
  if (!response.success) throw new Error(response.message || 'Không tải được sản phẩm chờ duyệt');
  return (response.data || []).map(mapProduct);
}

export async function adminUpdateProductStatusApi(token: string, productId: string, status: string, rejectionReason?: string): Promise<PartnerProduct> {
  const response = await requestJson<any>(`/admin/products/${productId}/status`, {
    method: 'PATCH',
    token,
    body: { status, rejection_reason: rejectionReason },
  });
  if (!response.success || !response.data) throw new Error(response.message || 'Cập nhật sản phẩm thất bại');
  return mapProduct(response.data);
}
