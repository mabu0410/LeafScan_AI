import { requestJson, API_BASE_URL } from '../api';

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  type: string;
  updated_at: string;
}

export interface AIModel {
  filename: string;
  path: string;
  is_active: boolean;
  size_mb: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const API_PATH = '/admin/settings';

const getToken = () => {
  const sessionData = localStorage.getItem('leafscan-admin-session');
  if (!sessionData) return undefined;
  try {
    const parsed = JSON.parse(sessionData);
    return parsed.accessToken;
  } catch {
    return undefined;
  }
};

export const settingsApi = {
  getAllSettings: async (): Promise<SystemSetting[]> => {
    const token = getToken();
    const response = await requestJson<ApiEnvelope<SystemSetting[]>>(API_PATH, { token });
    return response.data || [];
  },

  updateSetting: async (key: string, value: string): Promise<void> => {
    const token = getToken();
    await requestJson(`${API_PATH}/${key}`, {
      method: 'PUT',
      token,
      body: { value },
    });
  },

  listModels: async (): Promise<AIModel[]> => {
    const token = getToken();
    const response = await requestJson<ApiEnvelope<AIModel[]>>(`${API_PATH}/models/list`, { token });
    return response.data || [];
  },

  uploadModel: async (file: File): Promise<{ path: string }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}${API_PATH}/models/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    if (!response.ok) {
        let errorMsg = 'Upload thất bại';
        try {
            const data = await response.json();
            if (data.detail) errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
            else if (data.message) errorMsg = data.message;
        } catch(e) {}
        throw new Error(errorMsg);
    }
    
    return await response.json();
  },

  activateModel: async (path: string): Promise<void> => {
    const token = getToken();
    await requestJson(`${API_PATH}/models/active`, {
      method: 'POST',
      token,
      body: { path },
    });
  },
};
