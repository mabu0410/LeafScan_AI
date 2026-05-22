import { requestJson } from './client';
import {
  HomeAttentionPlant,
  HomeCareLog,
  HomeGardenSummary,
  HomeRecentActivity,
  HomeRecentScan,
  HomeSummary,
  HomeTask,
  HomeTodayTip,
  HomeUser,
  HomeWeather,
} from '../types/home';
import { toApiAssetUrl } from './config';

function mapUser(raw: any): HomeUser {
  return {
    id: Number(raw?.id ?? 0),
    name: raw?.name || 'Người dùng LeafScan',
    email: raw?.email || '',
    avatar: raw?.avatar || null,
  };
}

function mapTip(raw: any): HomeTodayTip {
  return {
    id: Number(raw?.id ?? 0),
    slug: raw?.slug || undefined,
    title: raw?.title || 'Mẹo chăm sóc cây',
    summary: raw?.summary || '',
    content: raw?.content || '',
    category: raw?.category || 'Chăm sóc cơ bản',
    suitablePlants: Array.isArray(raw?.suitable_plants)
      ? raw.suitable_plants.filter(Boolean)
      : [],
    sourceName: raw?.source_name || null,
    sourceUrl: raw?.source_url || null,
    sourceNote: raw?.source_note || null,
  };
}

function mapWeather(raw: any): HomeWeather {
  return {
    location: raw?.location || 'Không xác định',
    temperatureC: raw?.temperature_c == null ? null : Number(raw.temperature_c),
    humidityPercent: raw?.humidity_percent == null ? null : Number(raw.humidity_percent),
    windSpeedKmh: raw?.wind_speed_kmh == null ? null : Number(raw.wind_speed_kmh),
    condition: raw?.condition || 'Không có dữ liệu',
    weatherCode: raw?.weather_code == null ? null : Number(raw.weather_code),
    observedAt: raw?.observed_at || null,
  };
}

function mapGardenSummary(raw: any): HomeGardenSummary {
  return {
    attentionPlants: Number(raw?.attention_plants ?? 0),
    lastScanAt: raw?.last_scan_at || null,
  };
}

function mapAttentionPlant(raw: any): HomeAttentionPlant {
  return {
    id: Number(raw?.id ?? 0),
    name: raw?.name || 'Cây chưa đặt tên',
    latinName: raw?.latin_name || null,
    status:
      raw?.status === 'warning' || raw?.status === 'critical'
        ? raw.status
        : 'healthy',
    healthScore: Number(raw?.health_score ?? 0),
    imageUrl: toApiAssetUrl(raw?.image_url) || toApiAssetUrl(raw?.thumbnail_url) || null,
    location: raw?.location || null,
    lastScanned: raw?.last_scanned || null,
  };
}

function mapRecentScan(raw: any): HomeRecentScan {
  const status =
    raw?.status === 'moderate' || raw?.status === 'severe'
      ? raw.status
      : raw?.status === 'warning'
        ? 'moderate'
        : raw?.status === 'critical'
          ? 'severe'
          : 'healthy';

  return {
    id: Number(raw?.id ?? 0),
    plantName: raw?.plant_name || 'Cây chưa đặt tên',
    resultName: raw?.result_name || raw?.result || 'Không xác định',
    confidence: Number(raw?.confidence ?? 0),
    status,
    scannedAt: raw?.scanned_at || raw?.scan_date || new Date().toISOString(),
    imageUrl: toApiAssetUrl(raw?.image_url) || null,
  };
}

function mapRecentActivity(raw: any): HomeRecentActivity {
  return {
    id: String(raw?.id || ''),
    activityType: raw?.activity_type || 'activity',
    title: raw?.title || 'Hoạt động',
    subtitle: raw?.subtitle || '',
    occurredAt: raw?.occurred_at || new Date().toISOString(),
    status: raw?.status || null,
  };
}

function mapTask(raw: any): HomeTask {
  return {
    id: Number(raw?.id ?? 0),
    title: raw?.title || 'Việc chăm sóc',
    taskType: raw?.task_type || 'general',
    dueAt: raw?.due_at || null,
    status: raw?.status || 'pending',
    plantId: raw?.plant_id == null ? null : Number(raw.plant_id),
    plantName: raw?.plant_name || null,
  };
}

function mapCareLog(raw: any): HomeCareLog {
  return {
    id: Number(raw?.id ?? 0),
    title: raw?.title || 'Nhật ký chăm sóc',
    description: raw?.description || null,
    logType: raw?.log_type || 'general',
    performedAt: raw?.performed_at || new Date().toISOString(),
    plantId: raw?.plant_id == null ? null : Number(raw.plant_id),
    plantName: raw?.plant_name || null,
  };
}

function mapSummaryPayload(raw: any): HomeSummary {
  return {
    user: mapUser(raw?.user || {}),
    stats: {
      averageHealth:
        raw?.stats?.average_health == null
          ? null
          : Number(raw.stats.average_health),
      scannedPlants: Number(raw?.stats?.scanned_plants ?? 0),
      alerts: Number(raw?.stats?.alerts ?? 0),
    },
    todayTip: raw?.today_tip ? mapTip(raw.today_tip) : null,
    weather: mapWeather(raw?.weather || {}),
    gardenSummary: mapGardenSummary(raw?.garden_summary || {}),
    attentionPlants: Array.isArray(raw?.attention_plants)
      ? raw.attention_plants.map(mapAttentionPlant)
      : [],
    recentScans: Array.isArray(raw?.recent_scans)
      ? raw.recent_scans.map(mapRecentScan)
      : [],
    recentActivities: Array.isArray(raw?.recent_activities)
      ? raw.recent_activities.map(mapRecentActivity)
      : [],
    todayTasks: Array.isArray(raw?.today_tasks) ? raw.today_tasks.map(mapTask) : [],
    careLogs: Array.isArray(raw?.care_logs) ? raw.care_logs.map(mapCareLog) : [],
  };
}

export async function fetchHomeSummaryApi(token: string): Promise<HomeSummary> {
  const response = await requestJson<any>('/home/summary', { token });
  const payload = response?.data || response;
  if (!payload || !payload.user || !payload.stats) {
    throw new Error(response?.message || 'Dữ liệu trang chủ không hợp lệ');
  }
  return mapSummaryPayload(payload);
}
