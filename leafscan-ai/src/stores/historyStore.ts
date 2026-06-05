import { create } from 'zustand';
import { ScanHistory } from '../types';
import { fetchHistoryApi } from '../api/history';
import { useAuthStore } from './authStore';
import { fetchWithCache } from '../utils/offlineCache';

interface HistoryFilter {
  severity: 'all' | 'healthy' | 'moderate' | 'severe';
  plantId: string | null;
  dateRange: 'all' | 'today' | 'week' | 'month';
  disease: string | null;
}

interface HistoryState {
  scans: ScanHistory[];
  loading: boolean;
  loadHistory: () => Promise<void>;
  addScan: (scan: ScanHistory) => void;
  deleteScan: (id: string) => void;
  getFilteredScans: (filter: HistoryFilter) => ScanHistory[];
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  scans: [],
  loading: false,
  loadHistory: async () => {
    const token = useAuthStore.getState().accessToken;
    const userId = useAuthStore.getState().user?.id || 'me';
    if (!token) return;
    set({ loading: true });
    try {
      const result = await fetchWithCache(`scan-history:${userId}`, () => fetchHistoryApi(token));
      set({ scans: result.data });
    } finally {
      set({ loading: false });
    }
  },
  addScan: (scan) =>
    set((state) => ({
      scans: [scan, ...state.scans],
    })),
  deleteScan: (id) =>
    set((state) => ({
      scans: state.scans.filter((s) => s.id !== id),
    })),
  getFilteredScans: (filter) => {
    let result = [...get().scans];

    if (filter.severity !== 'all') {
      result = result.filter((s) => s.severity === filter.severity);
    }

    if (filter.plantId) {
      result = result.filter((s) => s.plantName.includes(filter.plantId || ''));
    }

    if (filter.disease) {
      result = result.filter((s) => s.result === filter.disease);
    }

    return result;
  },
}));
