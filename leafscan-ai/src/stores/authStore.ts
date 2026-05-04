import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, meApi, registerApi } from '../api/auth';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  isFirstLaunch: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  completeOnboarding: () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoggedIn: false,
      isFirstLaunch: true,
      login: async ({ email, password }) => {
        const result = await loginApi(email, password);
        set({
          user: result.user,
          accessToken: result.accessToken,
          isLoggedIn: true,
        });
      },
      logout: () => set({ user: null, accessToken: null, isLoggedIn: false }),
      register: async ({ name, email, password }) => {
        const result = await registerApi(name, email, password);
        set({
          user: result.user,
          accessToken: result.accessToken,
          isLoggedIn: true,
        });
      },
      completeOnboarding: () => set({ isFirstLaunch: false }),
      refreshProfile: async () => {
        const token = get().accessToken;
        if (!token) return;
        const user = await meApi(token);
        set({ user, isLoggedIn: true });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
