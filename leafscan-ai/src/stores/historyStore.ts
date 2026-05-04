import { create } from 'zustand';
import { ScanHistory } from '../types';
import { fetchHistoryApi } from '../api/history';
import { useAuthStore } from './authStore';

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
    if (!token) return;
    set({ loading: true });
    try {
      const scans = await fetchHistoryApi(token);
      set({ scans });
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
