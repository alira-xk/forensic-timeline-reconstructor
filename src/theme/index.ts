import { Platform } from 'react-native';

const palette = {
  // Shared Colors
  primary: '#1E3A8A',    // Deep Blue - Brand Color
  accent: '#0EA5E9',     // Sky 500

  // Light Mode Colors
  light: {
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF',
    surfaceHighlight: '#F1F5F9', // Slate 100
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
    border: '#E2E8F0',
  },

  // Dark Mode Colors - Optimized for Low Light Analysis
  dark: {
    background: '#0F172A', // Slate 900
    surface: '#1E293B',    // Slate 800
    surfaceHighlight: '#334155', // Slate 700
    textPrimary: '#F1F5F9', // Slate 100
    textSecondary: '#CBD5E1', // Slate 300
    textMuted: '#64748B',    // Slate 500
    textInverse: '#FFFFFF',
    border: '#334155',     // Slate 700
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
    secondary: '#334155', // Slate 700
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
    sm: 4, md: 8, lg: 12, full: 9999,
  },
  typography: {
    header: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
    subHeader: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    caption: { fontSize: 12 },
  },
  shadows: {
    card: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
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
    primary: '#60A5FA', // Lighter blue for dark mode visibility (Blue 400)
    secondary: '#94A3B8', // Lighter slate for secondary actions
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
