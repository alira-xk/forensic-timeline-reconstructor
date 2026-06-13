import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { AppNavigator } from './src/navigation';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/auth/AuthContext';
import { ConfirmationDialog } from './src/components/ConfirmationDialog';

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
  if (!clerkPublishableKey) {
    throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.');
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ThemeProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </AuthProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
