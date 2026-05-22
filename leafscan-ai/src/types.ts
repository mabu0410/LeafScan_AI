export type DiseaseSeverity = 'healthy' | 'moderate' | 'severe';
export type DiseaseStage = 'healthy' | 'early' | 'middle' | 'late' | 'unknown';

export interface Plant {
  id: string;
  name: string;
  latinName: string;
  category: string;
  image: string;
  thumbnail: string;
  healthScore: number;
  lastScanned: string;
  location: string;
  daysTracked: number;
  totalScans: number;
  status: 'healthy' | 'warning' | 'critical';
  nextScan?: string;
  notes: string;
}

export interface Disease {
  success?: boolean;
  id: string;
  diseaseKey?: string;
  name: string;
  severity: DiseaseSeverity;
  confidence: number;
  description: string;
  symptoms: string[];
  treatment: string[];
  treatmentByStage?: Record<string, string[]>;
  generalCare?: string[];
  treatmentPlan?: string[];
  safetyNotice?: string;
  prevention: string[];
  affectedArea: number;
  image: string;
  imageUri?: string;
  uploadedImageUrl?: string;
  referenceImage?: string;
  predictedStage?: DiseaseStage;
  forecastStage7d?: DiseaseStage;
  forecastConfidence?: number;
}

export interface ScanHistory {
  id: string;
  diseaseKey?: string;
  plantName: string;
  date: string;
  scanDateISO?: string;
  result: string;
  severity: DiseaseSeverity;
  image: string;
  confidence: number;
  predictedStage: DiseaseStage;
  forecastStage7d: DiseaseStage;
  affectedAreaSnapshot?: number;
}

export interface DiseaseLibraryItem {
  id: string;
  name: string;
  plant: string;
  severity: DiseaseSeverity;
  casesThisMonth: number;
  image: string;
}

export interface PartnerMembership {
  id: string;
  status: string;
  priceVnd: number;
  durationDays: number;
  maxActiveProducts: number;
  startedAt: string;
  expiresAt: string;
}

export interface PartnerStore {
  id: string;
  userId?: string;
  companyName: string;
  storeName?: string;
  description?: string;
  address?: string;
  logoUrl?: string;
  coverUrl?: string;
  contactEmail: string;
  phone: string;
  businessLicense: string;
  businessLicenseFileUrl?: string;
  representativeName?: string;
  representativeRole?: string;
  serviceArea?: string;
  mainProducts?: string;
  advertisingCommitmentAccepted?: boolean;
  advertisingCommitmentAt?: string;
  productCategories: string[];
  websiteUrl?: string;
  contactUrl?: string;
  status: 'pending_review' | 'active' | 'suspended' | 'rejected' | string;
  rejectionReason?: string;
  activeMembership?: PartnerMembership;
  activeProductCount: number;
  createdAt: string;
}

export interface PartnerProduct {
  id: string;
  partnerId: string;
  partnerName?: string;
  partnerStatus?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceRange?: string;
  targetDiseases: string[];
  targetCategories: string[];
  productUrl?: string;
  isActive: boolean;
  moderationStatus: 'pending_review' | 'approved' | 'rejected' | string;
  rejectionReason?: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  partnerId: string;
  provider: string;
  txnRef: string;
  amountVnd: number;
  status: string;
  paymentUrl?: string;
  vnpTransactionNo?: string;
  providerResponseCode?: string;
  providerTransactionStatus?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export type UserSubscriptionTier = 'free' | 'personal' | 'pro' | string;
export type UserPlanKey = 'personal_monthly' | 'personal_yearly' | 'pro_monthly' | 'pro_yearly';

export interface SubscriptionStatus {
  tier: UserSubscriptionTier;
  remainingScans: number;
  dailyScanLimit: number;
  usedScansToday: number;
  expiresAt?: string;
}

export interface UserPaymentTransaction {
  id: string;
  userId: string;
  provider: string;
  txnRef: string;
  planKey: string;
  tier: UserSubscriptionTier;
  amountVnd: number;
  durationDays: number;
  dailyScanLimit: number;
  status: string;
  paymentUrl?: string;
  vnpTransactionNo?: string;
  providerResponseCode?: string;
  providerTransactionStatus?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  Scan: { plantId?: string; selectedPlantKey?: string } | undefined;
  Result: { result: Disease };
  Chat: { disease: Disease };
  DiseaseDetail: { diseaseId: string };
  PlantDetail: { plantId: string };
  AddPlant: undefined;
  EditPlant: { plantId: string };
  EditProfile: undefined;
  ChangePassword: undefined;
  Search: undefined;
  History: undefined;
  UpgradePlan: undefined;
  Marketplace: { diseaseKey?: string; category?: string } | undefined;
  PartnerStore: { partnerId: string };
  PartnerProductDetail: { product: PartnerProduct };
  PartnerChannel: undefined;
  AdminModeration: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Garden: undefined;
  ScanTab: undefined;
  MarketplaceTab: undefined;
  Profile: undefined;
};
