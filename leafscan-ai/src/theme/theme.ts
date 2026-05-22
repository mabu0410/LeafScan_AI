/**
 * Theme toàn app. Hỗ trợ dark mode bằng cách mutate `theme.colors` khi
 * `setTheme('dark' | 'light')` được gọi (xem `useThemeSync()` trong ThemeProvider).
 *
 * Tất cả screen cũ import `theme.colors.*` vẫn hoạt động — giá trị được swap
 * tại runtime, React sẽ re-render khi settingsStore.darkMode đổi
 * (useThemeSync trigger re-render qua Zustand subscribe).
 */

const LIGHT_COLORS = {
  bg: '#F7F4EF',
  bgCard: '#FFFFFF',
  bgDark: '#1C1917',
  bgMuted: '#F0EDE8',

  primary: '#5C8B5A',
  primaryLight: '#8DB88A',
  primaryPale: '#E8F2E7',

  accent: '#C17B3F',
  accentLight: '#F2D4B3',

  healthy: '#5C8B5A',
  moderate: '#C17B3F',
  severe: '#B85C5C',

  healthyBg: '#E8F2E7',
  moderateBg: '#FAF0E6',
  severeBg: '#FBEAEA',

  textPrimary: '#1C1917',
  textSecondary: '#6B6460',
  textMuted: '#A89F9B',
  textInverse: '#F7F4EF',

  border: '#E5E0DA',
  borderDark: '#D4CEC8',

  tabBg: '#FFFFFF',
  tabActive: '#5C8B5A',
  tabInactive: '#B5AFA9',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

const DARK_COLORS: typeof LIGHT_COLORS = {
  bg: '#0F1411',
  bgCard: '#1B221D',
  bgDark: '#0A0D0B',
  bgMuted: '#242B26',

  primary: '#7FB27C',
  primaryLight: '#5C8B5A',
  primaryPale: '#223027',

  accent: '#D49664',
  accentLight: '#4A3624',

  healthy: '#7FB27C',
  moderate: '#D49664',
  severe: '#D77C7C',

  healthyBg: '#223027',
  moderateBg: '#3A2A1E',
  severeBg: '#3A2020',

  textPrimary: '#F0EDE8',
  textSecondary: '#B5ADA7',
  textMuted: '#706A65',
  textInverse: '#0F1411',

  border: '#2E342F',
  borderDark: '#3A4038',

  tabBg: '#1B221D',
  tabActive: '#7FB27C',
  tabInactive: '#5A5552',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export type ThemeMode = 'light' | 'dark';

export const theme = {
  colors: { ...LIGHT_COLORS },
  fonts: {
    display: 'System',
    body: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    float: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 15,
      elevation: 5,
    },
    scanButton: {
      shadowColor: '#5C8B5A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  mode: 'light' as ThemeMode,
};

export type Theme = typeof theme;

/**
 * Swap màu theme runtime (gọi từ useThemeSync).
 * Mutate trực tiếp để các StyleSheet.create() đã cache vẫn trỏ đúng reference.
 */
export function applyTheme(mode: ThemeMode): void {
  const palette = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  Object.assign(theme.colors, palette);
  theme.mode = mode;
}
