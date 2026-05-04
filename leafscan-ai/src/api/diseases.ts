import { Disease, DiseaseLibraryItem } from '../types';
import { mapDisease } from './mappers';
import { requestJson } from './client';

interface DiseaseListQuery {
  query?: string;
  severity?: 'healthy' | 'moderate' | 'severe';
  limit?: number;
}

function buildListPath(params: DiseaseListQuery = {}): string {
  const searchParams = new URLSearchParams();

  if (params.query && params.query.trim()) {
    searchParams.set('q', params.query.trim());
  }
  if (params.severity) {
    searchParams.set('severity', params.severity);
  }
  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `/diseases?${query}` : '/diseases';
}

function mapDiseaseLibraryItem(apiDisease: any): DiseaseLibraryItem {
  const severity = apiDisease.severity === 'moderate' || apiDisease.severity === 'severe'
    ? apiDisease.severity
    : 'healthy';

  return {
    id: String(apiDisease.id),
    name: apiDisease.name || 'Không xác định',
    plant: apiDisease.plant || 'Không rõ',
    severity,
    casesThisMonth: Number(apiDisease.cases_this_month ?? 0),
    image: apiDisease.image || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80',
  };
}

export async function listDiseasesApi(params: DiseaseListQuery = {}): Promise<DiseaseLibraryItem[]> {
  const response = await requestJson<any>(buildListPath(params));
  if (!response.success) {
    throw new Error(response.message || 'Không lấy được danh sách bệnh');
  }
  return (response.data || []).map(mapDiseaseLibraryItem);
}

export async function getDiseaseDetailApi(diseaseKey: string): Promise<Disease> {
  const response = await requestJson<any>(`/diseases/${diseaseKey}`);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không lấy được chi tiết bệnh');
  }
  return mapDisease(response.data);
}
