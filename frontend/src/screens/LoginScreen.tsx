import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Moon, ShieldCheck, Sun } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AppLogo } from '../components/AppLogo';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      setFormSuccess(null);
      setFormError('Email and password are required.');
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setFormSuccess(null);

    const result = await login(cleanEmail, password);

    setIsLoading(false);

    if (!result.success) {
      if (result.code === 'account_not_found') {
        setFormError('Account not found. Redirecting to Sign Up...');

        redirectTimer.current = setTimeout(() => {
          navigation.replace('SignUp', { email: cleanEmail });
        }, 1200);

        return;
      }

      if (result.code === 'account_not_verified') {
        setFormError('Please verify your email before login.');

        redirectTimer.current = setTimeout(() => {
          navigation.navigate('OtpVerification', { email: result.email || cleanEmail });
        }, 1200);

        return;
      }

      if (result.code === 'invalid_password') {
        setFormError('Invalid password. Please try again.');
        return;
      }

      setFormError(result.message || 'Login failed.');
      return;
    }

    setFormSuccess('Login successful. Opening dashboard...');
  };

  const goToSignUp = () => {
    navigation.navigate('SignUp', { email: email.trim().toLowerCase() || undefined });
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity
        onPress={toggleTheme}
        style={[
          styles.themeToggle,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        activeOpacity={0.85}
      >
        {isDark ? (
          <Sun size={20} color={theme.colors.text.primary} />
        ) : (
          <Moon size={20} color={theme.colors.text.primary} />
        )}
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <AppLogo size={94} />
            </View>

            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              FORENSIC TIMELINE
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              RECONSTRUCTOR
            </Text>

            <Text style={[styles.systemLabel, { color: theme.colors.text.muted }]}>
              Digital Evidence Analysis System
            </Text>
          </View>

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.shadows.card.shadowColor,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.surfaceHighlight }]}>
                <ShieldCheck size={22} color={theme.colors.primary} />
              </View>

              <View>
                <Text style={[styles.loginHeader, { color: theme.colors.text.primary }]}>
                  Investigator Login
                </Text>

                <Text style={[styles.loginSubtext, { color: theme.colors.text.secondary }]}>
                  Access your forensic cases and evidence timelines.
                </Text>
              </View>
            </View>

            <Input
              label="Email Address"
              placeholder="Enter registered email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setFormError(null);
                setFormSuccess(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Input
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setFormError(null);
                setFormSuccess(null);
              }}
              secureTextEntry
            />

            {formError ? (
              <View
                style={[
                  styles.messageBanner,
                  {
                    backgroundColor: `${theme.colors.status.error}12`,
                    borderColor: theme.colors.status.error,
                  },
                ]}
              >
                <Text style={[styles.messageText, { color: theme.colors.status.error }]}>
                  {formError}
                </Text>
              </View>
            ) : null}

            {formSuccess ? (
              <View
                style={[
                  styles.messageBanner,
                  {
                    backgroundColor: `${theme.colors.status.success}12`,
                    borderColor: theme.colors.status.success,
                  },
                ]}
              >
                <Text style={[styles.messageText, { color: theme.colors.status.success }]}>
                  {formSuccess}
                </Text>
              </View>
            ) : null}

            <Button
              title="Login"
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.loginButton}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity
              style={styles.signupRow}
              onPress={goToSignUp}
              activeOpacity={0.8}
            >
              <Text style={[styles.signupText, { color: theme.colors.text.secondary }]}>
                New investigator?
              </Text>

              <Text style={[styles.signupLink, { color: theme.colors.primary }]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  themeToggle: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 4,
  },
  systemLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderRadius: 24,
    padding: 26,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginHeader: {
    fontSize: 22,
    fontWeight: '900',
  },
  loginSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  messageBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  loginButton: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 22,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  signupText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '900',
  },
});