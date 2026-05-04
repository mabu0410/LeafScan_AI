import { Plant } from '../types';
import { requestJson } from './client';
import { mapPlant } from './mappers';

export interface PlantPayload {
  name: string;
  latin_name?: string;
  category?: string;
  location?: string;
  notes?: string;
  image_url?: string;
  thumbnail_url?: string;
}

export async function fetchPlantsApi(token: string): Promise<Plant[]> {
  const response = await requestJson<any>('/plants', { token });
  if (!response.success) {
    throw new Error(response.message || 'Không lấy được danh sách cây');
  }
  return (response.data || []).map(mapPlant);
}

export async function createPlantApi(token: string, payload: PlantPayload): Promise<Plant> {
  const response = await requestJson<any>('/plants', {
    method: 'POST',
    token,
    body: payload,
  });
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Thêm cây thất bại');
  }
  return mapPlant(response.data);
}

export async function updatePlantApi(token: string, plantId: string, payload: Partial<PlantPayload>): Promise<Plant> {
  const response = await requestJson<any>(`/plants/${plantId}`, {
    method: 'PUT',
    token,
    body: payload,
  });
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Cập nhật cây thất bại');
  }
  return mapPlant(response.data);
}

export async function deletePlantApi(token: string, plantId: string): Promise<void> {
  await requestJson(`/plants/${plantId}`, {
    method: 'DELETE',
    token,
  });
}
