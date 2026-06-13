import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();

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

      if (result.code === 'otp_sent') {
        setFormSuccess('Verification code sent. Opening verification...');

        redirectTimer.current = setTimeout(() => {
          navigation.navigate('OtpVerification', { email: result.email || cleanEmail });
        }, 800);

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
              Forensic Timeline
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Evidence reconstruction workspace
            </Text>
          </View>

          <View
            style={[
              styles.formCard,
              {
                width: Math.min(420, Math.max(280, width - 48)),
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

              <View style={styles.cardHeaderText}>
                <Text style={[styles.loginHeader, { color: theme.colors.text.primary }]}>
                  Sign in
                </Text>

                <Text style={[styles.loginSubtext, { color: theme.colors.text.secondary }]}>
                  Continue to your cases, evidence files, and timelines.
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

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotLink}
              activeOpacity={0.8}
            >
              <Text style={[styles.forgotText, { color: theme.colors.primary }]}>Forgot password?</Text>
            </TouchableOpacity>

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
                Need access?
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
    paddingVertical: 32,
  },
  themeToggle: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoContainer: {
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0,
    marginTop: 6,
  },
  formCard: {
    alignSelf: 'center',
    maxWidth: 420,
    minWidth: 0,
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 26,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
    ...Platform.select({ web: { boxSizing: 'border-box' } as any }),
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginHeader: {
    fontSize: 22,
    fontWeight: '800',
  },
  loginSubtext: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    flexShrink: 1,
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
    marginTop: 6,
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
