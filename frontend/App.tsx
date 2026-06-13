import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/auth/AuthContext';
import { AppClerkProvider } from './src/auth/clerkBindings';
import { ConfirmationDialog } from './src/components/ConfirmationDialog';

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_test_Y2hhbXBpb24tcmVwdGlsZS0yNC5jbGVyay5hY2NvdW50cy5kZXYk';

const AppContent = () => {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <ConfirmationDialog />
    </>
  );
};

export default function App() {
  return (
    <AppClerkProvider publishableKey={clerkPublishableKey}>
      <ThemeProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppClerkProvider>
  );
}
