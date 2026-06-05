export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface AdminCountBreakdown {
  total: number;
  pending: number;
  active: number;
  approved: number;
  rejected: number;
  suspended: number;
}

export interface AdminRevenueStats {
  user_success_vnd: number;
  partner_success_vnd: number;
  total_success_vnd: number;
  user_success_count: number;
  partner_success_count: number;
  pending_count: number;
}

export interface AdminPaymentStatusStats {
  user_pending_count: number;
  user_success_count: number;
  user_failed_count: number;
  partner_pending_count: number;
  partner_success_count: number;
  partner_failed_count: number;
  pending_amount_vnd: number;
  failed_amount_vnd: number;
}

export interface AdminScanActivityStats {
  today: number;
  last_7d: number;
  last_30d: number;
  average_confidence: number | null;
  low_confidence: number;
  with_plant: number;
  without_plant: number;
}

export interface AdminMarketplaceStats {
  stores_total: number;
  stores_active: number;
  memberships_total: number;
  memberships_active: number;
  memberships_expired: number;
  impressions_total: number;
  clicks_total: number;
  click_rate: number;
}

export interface AdminContentStats {
  diseases_total: number;
  care_tips_total: number;
  care_tips_active: number;
  care_tips_hidden: number;
}

export interface AdminScanSeriesItem {
  date: string;
  scans: number;
}

export interface AdminTopDiseaseItem {
  disease_key: string;
  disease_name: string | null;
  scans: number;
  avg_confidence: number | null;
}

export interface AdminTopProductItem {
  product_id: number;
  product_name: string;
  partner_name: string | null;
  impressions: number;
  clicks: number;
  click_rate: number;
}

export interface AdminRecentTransactionItem {
  id: number;
  kind: string;
  owner_name: string;
  plan_label: string;
  amount_vnd: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

export interface AdminDashboardData {
  users: AdminCountBreakdown;
  scans: AdminCountBreakdown;
  plants: AdminCountBreakdown;
  partners: AdminCountBreakdown;
  products: AdminCountBreakdown;
  subscriptions: AdminCountBreakdown;
  notifications: AdminCountBreakdown;
  revenue: AdminRevenueStats;
  payments: AdminPaymentStatusStats;
  activity: AdminScanActivityStats;
  marketplace: AdminMarketplaceStats;
  content: AdminContentStats;
  scan_series: AdminScanSeriesItem[];
  top_diseases: AdminTopDiseaseItem[];
  top_products: AdminTopProductItem[];
  recent_transactions: AdminRecentTransactionItem[];
}

export interface PartnerStore {
  id: number;
  user_id: number | null;
  company_name: string;
  store_name: string | null;
  description: string | null;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  contact_email: string;
  phone: string;
  business_license: string;
  business_license_file_url: string | null;
  representative_name: string | null;
  representative_role: string | null;
  service_area: string | null;
  main_products: string | null;
  advertising_commitment_accepted: boolean;
  product_categories: string[];
  website_url: string | null;
  contact_url: string | null;
  status: string;
  rejection_reason: string | null;
  active_product_count: number;
  created_at: string;
}

export interface PartnerProduct {
  id: number;
  partner_id: number;
  partner_name: string | null;
  partner_status: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price_range: string | null;
  target_diseases: string[];
  target_categories: string[];
  product_url: string | null;
  is_active: boolean;
  moderation_status: string;
  rejection_reason: string | null;
  created_at: string;
}

export interface CareTip {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  suitable_plants: string[];
  related_disease_id: number | null;
  priority: number;
  is_active: boolean;
  source_name: string | null;
  source_url: string | null;
  source_note: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareTipPayload {
  slug?: string | null;
  title: string;
  summary: string;
  content: string;
  category: string;
  suitable_plants: string[];
  related_disease_id?: number | null;
  priority: number;
  is_active: boolean;
  source_name?: string | null;
  source_url?: string | null;
  source_note?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  page_count: number;
}

export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  plant_count: number;
  scan_count: number;
  created_at: string;
}

export interface AdminPaymentItem {
  id: number;
  kind: string;
  owner_id: number;
  owner_name: string;
  owner_email: string | null;
  provider: string;
  txn_ref: string;
  plan_label: string;
  amount_vnd: number;
  status: string;
  payment_url: string | null;
  vnp_transaction_no: string | null;
  provider_response_code: string | null;
  provider_transaction_status: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface AdminRevenueSeriesItem {
  period: string;
  gross_vnd: number;
  fee_vnd: number;
  net_vnd: number;
  refunded_vnd: number;
  transaction_count: number;
}

export interface AdminPartnerRevenueItem {
  partner_id: number;
  partner_name: string;
  contact_email: string | null;
  gross_vnd: number;
  fee_vnd: number;
  net_vnd: number;
  refunded_vnd: number;
  transaction_count: number;
  last_paid_at: string | null;
}

export interface AdminRevenueReportData {
  start_date: string;
  end_date: string;
  period: 'daily' | 'monthly' | string;
  kind: 'all' | 'user' | 'partner' | string;
  partner_id: number | null;
  fee_percent: number;
  fee_fixed_vnd: number;
  gross_success_vnd: number;
  user_success_vnd: number;
  partner_success_vnd: number;
  refunded_vnd: number;
  vnpay_fee_vnd: number;
  net_revenue_vnd: number;
  success_count: number;
  refunded_count: number;
  pending_count: number;
  failed_count: number;
  series: AdminRevenueSeriesItem[];
  partner_reports: AdminPartnerRevenueItem[];
}

export interface AdminScanItem {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  plant_id: number | null;
  plant_name: string | null;
  disease_key: string | null;
  disease_name: string | null;
  image_url: string;
  confidence: number;
  predicted_stage: string;
  forecast_stage_7d: string;
  affected_area_snapshot: number | null;
  scan_date: string;
}

export interface AdminDiseaseItem {
  id: number;
  disease_key: string;
  model_class_name: string | null;
  name: string;
  severity: string | null;
  description: string | null;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  affected_area_typical: number;
  image_url: string | null;
}

export interface AdminDiseasePayload {
  disease_key: string;
  model_class_name?: string | null;
  name: string;
  severity?: string | null;
  description?: string | null;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  affected_area_typical: number;
  image_url?: string | null;
}

export interface NotificationItem {
  id: number;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListData {
  items: NotificationItem[];
  unread_count: number;
}

export interface MarketplaceInquiry {
  id: number;
  user_id: number;
  partner_id: number;
  product_id: number | null;
  store_id: number | null;
  partner_name: string | null;
  product_name: string | null;
  store_name: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  status: 'new' | 'contacted' | 'closed' | string;
  created_at: string;
  updated_at: string;
}
