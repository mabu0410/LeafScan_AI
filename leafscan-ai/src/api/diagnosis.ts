import { Disease } from '../types';
import { requestJson } from './client';
import { mapDisease } from './mappers';

export interface DiagnoseInput {
  token: string;
  imageUri: string;
  plantId?: string;
}

export async function diagnoseApi(input: DiagnoseInput): Promise<Disease> {
  const form = new FormData();
  const filename = input.imageUri.split('/').pop() || `leaf_${Date.now()}.jpg`;

  form.append('file', {
    uri: input.imageUri,
    type: 'image/jpeg',
    name: filename,
  } as any);

  if (input.plantId) {
    form.append('plant_id', input.plantId);
  }

  const response = await requestJson<any>('/diagnose', {
    method: 'POST',
    token: input.token,
    body: form,
  });

  if (!response.success) {
    throw new Error(response.message || 'Chẩn đoán thất bại');
  }
  if (response.low_confidence || !response.top_prediction) {
    throw new Error(response.message || 'Ảnh chưa đủ rõ để chẩn đoán');
  }

  return mapDisease(response.top_prediction, response);
}
