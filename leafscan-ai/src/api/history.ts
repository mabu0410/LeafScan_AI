import { ScanHistory } from '../types';
import { requestJson } from './client';
import { mapHistoryItem } from './mappers';

export async function fetchHistoryApi(token: string): Promise<ScanHistory[]> {
  const response = await requestJson<any>('/history', { token });
  if (!response.success) {
    throw new Error(response.message || 'Không lấy được lịch sử quét');
  }
  return (response.data || []).map(mapHistoryItem);
}
