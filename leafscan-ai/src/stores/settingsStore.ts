import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  notifications: boolean;
  darkMode: boolean;
  language: 'vi' | 'en';
  scanQuality: 'normal' | 'high' | 'ultra';
  toggleNotifications: () => void;
  toggleDarkMode: () => void;
  updateSettings: (key: string, value: any) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: true,
      darkMode: false,
      language: 'vi',
      scanQuality: 'high',
      toggleNotifications: () => set((state) => ({ notifications: !state.notifications })),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      updateSettings: (key, value) => set({ [key]: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
