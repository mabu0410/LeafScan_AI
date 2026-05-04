import { Disease, DiseaseSeverity, DiseaseStage, Plant, ScanHistory } from '../types';

function mapSeverity(value: string): DiseaseSeverity {
  if (value === 'healthy' || value === 'moderate' || value === 'severe') {
    return value;
  }
  return 'healthy';
}

function mapStage(value: string | undefined): DiseaseStage {
  if (value === 'healthy' || value === 'early' || value === 'middle' || value === 'late' || value === 'unknown') {
    return value;
  }
  return 'unknown';
}

export function mapPlant(apiPlant: any): Plant {
  return {
    id: String(apiPlant.id),
    name: apiPlant.name || 'Chưa đặt tên',
    latinName: apiPlant.latin_name || '',
    category: apiPlant.category || 'Khác',
    image: apiPlant.image_url || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
    thumbnail: apiPlant.thumbnail_url || apiPlant.image_url || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&q=80',
    healthScore: Number(apiPlant.health_score ?? 100),
    lastScanned: apiPlant.last_scanned || 'Chưa quét',
    location: apiPlant.location || 'Chưa cập nhật',
    daysTracked: Number(apiPlant.days_tracked ?? 0),
    totalScans: Number(apiPlant.total_scans ?? 0),
    status: apiPlant.status === 'warning' || apiPlant.status === 'critical' ? apiPlant.status : 'healthy',
    nextScan: 'Hôm nay',
    notes: apiPlant.notes || '',
  };
}

export function mapDisease(apiDisease: any, diagnosis?: any): Disease {
  return {
    id: apiDisease.id,
    name: apiDisease.name,
    severity: mapSeverity(apiDisease.severity),
    confidence: Number(apiDisease.confidence ?? 0),
    description: apiDisease.description || '',
    symptoms: apiDisease.symptoms || [],
    treatment: apiDisease.treatment || [],
    treatmentByStage: apiDisease.treatment_by_stage || undefined,
    generalCare: apiDisease.general_care || undefined,
    treatmentPlan: diagnosis?.treatment_plan || undefined,
    safetyNotice: diagnosis?.safety_notice || apiDisease.safety_notice || undefined,
    prevention: apiDisease.prevention || [],
    affectedArea: Number(apiDisease.affected_area ?? 0),
    image: apiDisease.image || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    predictedStage: mapStage(diagnosis?.predicted_stage),
    forecastStage7d: mapStage(diagnosis?.forecast_stage_7d),
    forecastConfidence: Number(diagnosis?.forecast_confidence ?? 0),
  };
}

export function mapHistoryItem(apiHistory: any): ScanHistory {
  const dateRaw = apiHistory.scan_date ? new Date(apiHistory.scan_date) : new Date();
  const date = Number.isNaN(dateRaw.getTime())
    ? 'Không xác định'
    : `${dateRaw.getHours().toString().padStart(2, '0')}:${dateRaw.getMinutes().toString().padStart(2, '0')} · ${dateRaw.toLocaleDateString('vi-VN')}`;

  return {
    id: String(apiHistory.id),
    diseaseKey: apiHistory.disease_key || undefined,
    plantName: apiHistory.plant_name || 'Cây chưa đặt tên',
    date,
    scanDateISO: Number.isNaN(dateRaw.getTime()) ? undefined : dateRaw.toISOString(),
    result: apiHistory.result || 'Không xác định',
    severity: mapSeverity(apiHistory.severity || 'healthy'),
    image: apiHistory.image_url || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80',
    confidence: Number(apiHistory.confidence ?? 0),
    predictedStage: mapStage(apiHistory.predicted_stage),
    forecastStage7d: mapStage(apiHistory.forecast_stage_7d),
    affectedAreaSnapshot: apiHistory.affected_area_snapshot == null ? undefined : Number(apiHistory.affected_area_snapshot),
  };
}
