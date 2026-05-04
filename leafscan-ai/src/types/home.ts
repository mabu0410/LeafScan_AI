export type HomePlantStatus = 'healthy' | 'warning' | 'critical';
export type HomeScanStatus = 'healthy' | 'moderate' | 'severe';

export interface HomeUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

export interface HomeStats {
  averageHealth: number | null;
  scannedPlants: number;
  alerts: number;
}

export interface HomeTodayTip {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  suitablePlants: string[];
}

export interface HomeAttentionPlant {
  id: number;
  name: string;
  latinName?: string | null;
  status: HomePlantStatus;
  healthScore: number;
  imageUrl: string | null;
  location?: string | null;
  lastScanned?: string | null;
}

export interface HomeRecentScan {
  id: number;
  plantName: string;
  resultName: string;
  confidence: number;
  status: HomeScanStatus;
  scannedAt: string;
  imageUrl: string | null;
}

export interface HomeSummary {
  user: HomeUser;
  stats: HomeStats;
  todayTip: HomeTodayTip;
  attentionPlants: HomeAttentionPlant[];
  recentScans: HomeRecentScan[];
}
