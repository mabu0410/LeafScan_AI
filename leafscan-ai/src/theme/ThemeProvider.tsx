/**
 * ThemeProvider — Apply theme (light/dark) dựa vào settingsStore.darkMode.
 *
 * Bọc App.tsx bằng <ThemeProvider>{children}</ThemeProvider>.
 * Khi user toggle dark mode, theme.colors được swap và App re-render qua
 * Zustand subscribe.
 */
import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { applyTheme, theme } from './theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const darkMode = useSettingsStore(state => state.darkMode);
  const [, forceRender] = useState(0);

  useEffect(() => {
    applyTheme(darkMode ? 'dark' : 'light');
    forceRender(n => n + 1);
  }, [darkMode]);

  return <>{children}</>;
}

export { theme };
