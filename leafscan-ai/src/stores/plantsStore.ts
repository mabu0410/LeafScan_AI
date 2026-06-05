import { create } from 'zustand';
import { Plant } from '../types';
import {
  createPlantApi,
  deletePlantApi,
  fetchPlantsApi,
  PlantPayload,
  updatePlantApi,
  uploadPlantImageApi,
} from '../api/plants';
import { useAuthStore } from './authStore';
import { fetchWithCache } from '../utils/offlineCache';

type AddPlantPayload = PlantPayload & {
  imageUri?: string | null;
};

interface FilterState {
  category: string;
  status: string;
  sortBy: string;
  searchQuery: string;
}

interface PlantsState {
  plants: Plant[];
  loading: boolean;
  loadPlants: () => Promise<void>;
  addPlant: (plant: AddPlantPayload) => Promise<void>;
  updatePlant: (id: string, data: Partial<PlantPayload>) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  getFilteredPlants: (filter: FilterState) => Plant[];
}

export const usePlantsStore = create<PlantsState>()((set, get) => ({
  plants: [],
  loading: false,
  loadPlants: async () => {
    const token = useAuthStore.getState().accessToken;
    const userId = useAuthStore.getState().user?.id || 'me';
    if (!token) return;
    set({ loading: true });
    try {
      const result = await fetchWithCache(`plants:${userId}`, () => fetchPlantsApi(token));
      set({ plants: result.data });
    } finally {
      set({ loading: false });
    }
  },
  addPlant: async (plant) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const { imageUri, ...payload } = plant;
    const created = await createPlantApi(token, payload);
    const finalPlant = imageUri
      ? await uploadPlantImageApi(token, created.id, imageUri)
      : created;
    set((state) => ({ plants: [finalPlant, ...state.plants] }));
  },
  updatePlant: async (id, data) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const updated = await updatePlantApi(token, id, data);
    set((state) => ({
      plants: state.plants.map((p) => (p.id === id ? updated : p)),
    }));
  },
  deletePlant: async (id) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    await deletePlantApi(token, id);
    set((state) => ({
      plants: state.plants.filter((p) => p.id !== id),
    }));
  },
  getFilteredPlants: (filter) => {
    let result = [...get().plants];

    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    if (filter.category !== 'all') {
      result = result.filter((p) => p.category.toLowerCase() === filter.category.toLowerCase());
    }

    if (filter.status !== 'all') {
      result = result.filter((p) => p.status === filter.status);
    }

    switch (filter.sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'health_asc':
        result.sort((a, b) => a.healthScore - b.healthScore);
        break;
      case 'health_desc':
        result.sort((a, b) => b.healthScore - a.healthScore);
        break;
      case 'recent':
      default:
        result.sort((a, b) => a.lastScanned.localeCompare(b.lastScanned));
        break;
    }

    return result;
  },
}));
