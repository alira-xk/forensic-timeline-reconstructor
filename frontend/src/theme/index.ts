import { Platform } from 'react-native';

const palette = {
  primary: '#2457D6',
  accent: '#0F9F8F',

  light: {
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceHighlight: '#ECEFF3',
    textPrimary: '#151A22',
    textSecondary: '#515A67',
    textMuted: '#7B8492',
    textInverse: '#FFFFFF',
    border: '#D9DEE7',
  },

  dark: {
    background: '#0E1116',
    surface: '#171C23',
    surfaceHighlight: '#222A34',
    textPrimary: '#F4F6F8',
    textSecondary: '#B8C0CC',
    textMuted: '#7F8A99',
    textInverse: '#FFFFFF',
    border: '#2B3440',
  },

  status: {
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#2563EB',
  },
};

export const lightTheme = {
  dark: false,
  colors: {
    background: palette.light.background,
    surface: palette.light.surface,
    surfaceHighlight: palette.light.surfaceHighlight,
    primary: palette.primary,
    secondary: '#3E4652',
    accent: palette.accent,
    text: {
      primary: palette.light.textPrimary,
      secondary: palette.light.textSecondary,
      muted: palette.light.textMuted,
      inverse: palette.light.textInverse,
    },
    status: palette.status,
    border: palette.light.border,
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  borderRadius: {
    sm: 4, md: 6, lg: 8, full: 9999,
  },
  typography: {
    header: { fontSize: 24, fontWeight: '700', letterSpacing: 0 },
    subHeader: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    caption: { fontSize: 12 },
  },
  shadows: {
    card: {
      shadowColor: '#1F2937',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 5,
      elevation: 1,
    },
    floating: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

export const darkTheme = {
  ...lightTheme,
  dark: true,
  colors: {
    ...lightTheme.colors,
    background: palette.dark.background,
    surface: palette.dark.surface,
    surfaceHighlight: palette.dark.surfaceHighlight,
    primary: '#6EA8FF',
    secondary: '#A4ADBA',
    accent: '#35C7B6',
    text: {
      primary: palette.dark.textPrimary,
      secondary: palette.dark.textSecondary,
      muted: palette.dark.textMuted,
      inverse: '#0F172A', // Inverse text on primary buttons in dark mode
    },
    border: palette.dark.border,
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    }
  }
};

export type Theme = typeof lightTheme;
// Default export for backward compatibility relative to user instructions
export const theme = lightTheme; 
