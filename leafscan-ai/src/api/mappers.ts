import { Disease, DiseaseSeverity, DiseaseStage, Plant, ScanHistory } from '../types';
import { toApiAssetUrl } from './config';

const PLANT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80';
const PLANT_THUMBNAIL_FALLBACK = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&q=80';
const DISEASE_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80';
const HISTORY_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80';

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
  const image = toApiAssetUrl(apiPlant.image_url);
  const thumbnail = toApiAssetUrl(apiPlant.thumbnail_url) || image;

  return {
    id: String(apiPlant.id),
    name: apiPlant.name || 'Chưa đặt tên',
    latinName: apiPlant.latin_name || '',
    category: apiPlant.category || 'Khác',
    image: image || PLANT_IMAGE_FALLBACK,
    thumbnail: thumbnail || PLANT_THUMBNAIL_FALLBACK,
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
  const modelConfidence = diagnosis?.prediction?.confidence;
  const confidencePercent = typeof modelConfidence === 'number'
    ? Number((modelConfidence * 100).toFixed(2))
    : Number(apiDisease.confidence ?? 0);

  const image = toApiAssetUrl(apiDisease.image || apiDisease.image_url);

  return {
    id: String(apiDisease.id ?? apiDisease.disease_key ?? ''),
    diseaseKey: apiDisease.disease_key || undefined,
    name: apiDisease.name,
    severity: mapSeverity(apiDisease.severity),
    confidence: confidencePercent,
    description: apiDisease.description || '',
    symptoms: apiDisease.symptoms || [],
    treatment: apiDisease.treatment || [],
    treatmentByStage: apiDisease.treatment_by_stage || undefined,
    generalCare: apiDisease.general_care || undefined,
    treatmentPlan: diagnosis?.treatment_plan || undefined,
    safetyNotice: diagnosis?.safety_notice || apiDisease.safety_notice || undefined,
    prevention: apiDisease.prevention || [],
    affectedArea: Number(apiDisease.affected_area ?? 0),
    image: image || DISEASE_IMAGE_FALLBACK,
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

  const image = toApiAssetUrl(apiHistory.image_url);

  return {
    id: String(apiHistory.id),
    diseaseKey: apiHistory.disease_key || undefined,
    plantName: apiHistory.plant_name || 'Cây chưa đặt tên',
    date,
    scanDateISO: Number.isNaN(dateRaw.getTime()) ? undefined : dateRaw.toISOString(),
    result: apiHistory.result || 'Không xác định',
    severity: mapSeverity(apiHistory.severity || 'healthy'),
    image: image || HISTORY_IMAGE_FALLBACK,
    confidence: Number(apiHistory.confidence ?? 0),
    predictedStage: mapStage(apiHistory.predicted_stage),
    forecastStage7d: mapStage(apiHistory.forecast_stage_7d),
    affectedAreaSnapshot: apiHistory.affected_area_snapshot == null ? undefined : Number(apiHistory.affected_area_snapshot),
  };
}
