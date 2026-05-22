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
  slug?: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  suitablePlants: string[];
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceNote?: string | null;
}

export interface HomeWeather {
  location: string;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  condition: string;
  weatherCode: number | null;
  observedAt: string | null;
}

export interface HomeGardenSummary {
  attentionPlants: number;
  lastScanAt: string | null;
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

export interface HomeRecentActivity {
  id: string;
  activityType: 'scan' | 'care_log' | string;
  title: string;
  subtitle: string;
  occurredAt: string;
  status?: string | null;
}

export interface HomeTask {
  id: number;
  title: string;
  taskType: string;
  dueAt: string | null;
  status: string;
  plantId?: number | null;
  plantName?: string | null;
}

export interface HomeCareLog {
  id: number;
  title: string;
  description?: string | null;
  logType: string;
  performedAt: string;
  plantId?: number | null;
  plantName?: string | null;
}

export interface HomeSummary {
  user: HomeUser;
  stats: HomeStats;
  todayTip: HomeTodayTip | null;
  weather: HomeWeather;
  gardenSummary: HomeGardenSummary;
  attentionPlants: HomeAttentionPlant[];
  recentScans: HomeRecentScan[];
  recentActivities: HomeRecentActivity[];
  todayTasks: HomeTask[];
  careLogs: HomeCareLog[];
}
