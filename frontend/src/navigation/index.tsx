import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  View,
} from 'react-native';
import { LayoutDashboard, FolderOpen, Activity } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { useAuth } from '../auth/AuthContext';

import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CasesListScreen } from '../screens/CasesListScreen';
import { CreateCaseScreen } from '../screens/CreateCaseScreen';
import { CaseDetailScreen } from '../screens/CaseDetailScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { EvidenceGraphScreen } from '../screens/EvidenceGraphScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === 'web' && width > 768;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: isWeb ? 'none' : 'flex',
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          shadowColor: theme.shadows.floating.shadowColor,
          borderTopWidth: 1,
          elevation: 5,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={22} color={color} />
          ),
          tabBarLabel: 'OVERVIEW',
        }}
      />

      <Tab.Screen
        name="CasesList"
        component={CasesListScreen}
        options={{
          tabBarIcon: ({ color }) => <FolderOpen size={22} color={color} />,
          tabBarLabel: 'CASES',
        }}
      />

      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          tabBarIcon: ({ color }) => <Activity size={22} color={color} />,
          tabBarLabel: 'TIMELINE',
        }}
      />
    </Tab.Navigator>
  );
};

const LoadingScreen = () => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
};

export const AppNavigator = () => {
  const { theme } = useTheme();
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={user ? 'authenticated' : 'guest'}
        initialRouteName={user ? 'Main' : 'Login'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />

            <Stack.Screen
              name="CreateCase"
              component={CreateCaseScreen}
              options={{ presentation: 'modal' }}
            />

            <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />

            <Stack.Screen name="Timeline" component={TimelineScreen} />
            <Stack.Screen name="EvidenceGraph" component={EvidenceGraphScreen} />

            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
