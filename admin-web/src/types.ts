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

export interface AdminDashboardData {
  users: AdminCountBreakdown;
  scans: AdminCountBreakdown;
  plants: AdminCountBreakdown;
  partners: AdminCountBreakdown;
  products: AdminCountBreakdown;
  subscriptions: AdminCountBreakdown;
  notifications: AdminCountBreakdown;
  revenue: AdminRevenueStats;
  scan_series: AdminScanSeriesItem[];
  top_diseases: AdminTopDiseaseItem[];
  top_products: AdminTopProductItem[];
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
