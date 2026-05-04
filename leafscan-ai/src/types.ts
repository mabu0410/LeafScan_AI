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
  id: string;
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

// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  Scan: undefined;
  Result: { result: Disease };
  Chat: { disease: Disease };
  DiseaseDetail: { diseaseId: string };
  PlantDetail: { plantId: string };
  AddPlant: undefined;
  EditPlant: { plantId: string };
  Search: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Garden: undefined;
  ScanTab: undefined;
  History: undefined;
  Profile: undefined;
};
