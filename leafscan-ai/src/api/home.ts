import { requestJson } from './client';
import {
  HomeAttentionPlant,
  HomeRecentScan,
  HomeSummary,
  HomeTodayTip,
  HomeUser,
} from '../types/home';

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
    title: raw?.title || 'Mẹo chăm sóc cây',
    summary: raw?.summary || '',
    content: raw?.content || '',
    category: raw?.category || 'Chăm sóc cơ bản',
    suitablePlants: Array.isArray(raw?.suitable_plants)
      ? raw.suitable_plants.filter(Boolean)
      : [],
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
    imageUrl: raw?.image_url || raw?.thumbnail_url || null,
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
    imageUrl: raw?.image_url || null,
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
    todayTip: mapTip(raw?.today_tip || {}),
    attentionPlants: Array.isArray(raw?.attention_plants)
      ? raw.attention_plants.map(mapAttentionPlant)
      : [],
    recentScans: Array.isArray(raw?.recent_scans)
      ? raw.recent_scans.map(mapRecentScan)
      : [],
  };
}

export async function fetchHomeSummaryApi(token: string): Promise<HomeSummary> {
  const response = await requestJson<any>('/home/summary', { token });
  const payload = response?.data || response;
  if (!payload || !payload.user || !payload.stats || !payload.today_tip) {
    throw new Error(response?.message || 'Dữ liệu trang chủ không hợp lệ');
  }
  return mapSummaryPayload(payload);
}
