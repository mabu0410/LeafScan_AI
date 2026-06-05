import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  notifications: boolean;
  darkMode: boolean;
  language: 'vi' | 'en';
  autoSaveScanImages: boolean;
  scanQuality: 'normal' | 'high' | 'ultra';
  toggleNotifications: () => void;
  toggleDarkMode: () => void;
  toggleAutoSaveScanImages: () => void;
  updateSettings: (key: string, value: any) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: false,
      darkMode: false,
      language: 'vi',
      autoSaveScanImages: true,
      scanQuality: 'high',
      toggleNotifications: () => set((state) => ({ notifications: !state.notifications })),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleAutoSaveScanImages: () => set((state) => ({ autoSaveScanImages: !state.autoSaveScanImages })),
      updateSettings: (key, value) => set({ [key]: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
