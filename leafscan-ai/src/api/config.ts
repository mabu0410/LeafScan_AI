export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
export const API_V1_URL = `${API_BASE_URL}/api/v1`;
