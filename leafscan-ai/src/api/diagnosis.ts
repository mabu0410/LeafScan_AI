import { Disease } from '../types';
import { requestJson } from './client';
import { toApiAssetUrl } from './config';
import { mapDisease } from './mappers';

export type DiagnoseErrorCode =
  | 'NO_LEAF_DETECTED'
  | 'IMAGE_TOO_DARK'
  | 'IMAGE_TOO_BLURRY'
  | 'UNSUPPORTED_PLANT'
  | 'PLANT_MISMATCH'
  | 'LOW_CONFIDENCE'
  | 'QUOTA_EXCEEDED'
  | 'REQUEST_FAILED'
  | 'DIAGNOSIS_FAILED';

export class DiagnoseApiError extends Error {
  code: DiagnoseErrorCode;
  details?: any;

  constructor(code: DiagnoseErrorCode, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'DiagnoseApiError';
    Object.setPrototypeOf(this, DiagnoseApiError.prototype);
  }
}

export interface DiagnoseInput {
  token: string;
  imageUri: string;
  plantId?: string;
  selectedPlantKey?: string;
}

export type ScanFeedbackValue = 'correct' | 'incorrect' | 'unsure';

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
  if (input.selectedPlantKey) {
    form.append('selected_plant_key', input.selectedPlantKey);
  }

  let response: any;
  try {
    response = await requestJson<any>('/diagnose', {
      method: 'POST',
      token: input.token,
      body: form,
    });
    console.log('[diagnoseApi] response', JSON.stringify(response));
  } catch (error: any) {
    const detail = error?.detail;
    if (error?.status === 402 && detail?.error_code === 'QUOTA_EXCEEDED') {
      throw new DiagnoseApiError(
        'QUOTA_EXCEEDED',
        detail?.message || 'Bạn đã hết lượt quét hôm nay.',
        detail
      );
    }
    throw new DiagnoseApiError(
      'REQUEST_FAILED',
      error?.message || 'Không thể kết nối đến dịch vụ chẩn đoán.',
      error
    );
  }

  if (!response?.success) {
    const errorCode = response?.error_code as DiagnoseErrorCode | undefined;
    throw new DiagnoseApiError(
      errorCode || 'DIAGNOSIS_FAILED',
      response?.message || 'Chẩn đoán thất bại.',
      response
    );
  }

  if (response?.low_confidence || !response?.prediction) {
    throw new DiagnoseApiError(
      'LOW_CONFIDENCE',
      response?.message || 'LeafScan chưa đủ tự tin để nhận diện.',
      response
    );
  }

  const prediction = response?.prediction;
  const classNameLower = typeof prediction?.class_name === 'string'
    ? prediction.class_name.toLowerCase()
    : '';
  const diseasePayload = response?.disease || response?.top_prediction || {
    id: prediction?.disease_key || prediction?.class_name || 'unknown',
    disease_key: prediction?.disease_key || 'unknown',
    name: prediction?.class_name || 'Không xác định',
    severity: classNameLower.includes('healthy') ? 'healthy' : 'moderate',
    description: 'Chưa có thông tin bệnh tương ứng trong thư viện dữ liệu.',
    symptoms: [],
    treatment: [],
    prevention: [],
    affected_area: 0,
    image_url: '',
  };

  const mapped = mapDisease(diseasePayload, response);
  const uploadedImageUrl = toApiAssetUrl(response?.scan_image_url) || toApiAssetUrl(response?.uploaded_image_url);
  const referenceImage = toApiAssetUrl(diseasePayload?.image_url || diseasePayload?.image) || mapped.image;

  return {
    success: true,
    ...mapped,
    scanId: response?.scan_id == null ? undefined : String(response.scan_id),
    imageUri: input.imageUri,
    uploadedImageUrl,
    referenceImage,
  };
}

export async function submitScanFeedbackApi(
  token: string,
  scanId: string,
  feedback: ScanFeedbackValue,
  note?: string
): Promise<void> {
  const response = await requestJson<any>(`/diagnose/${scanId}/feedback`, {
    method: 'POST',
    token,
    body: { feedback, note },
  });
  if (!response.success) throw new Error(response.message || 'Không gửi được phản hồi AI.');
}
