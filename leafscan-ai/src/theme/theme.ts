export const theme = {
  colors: {
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
  },
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
};

export type Theme = typeof theme;
