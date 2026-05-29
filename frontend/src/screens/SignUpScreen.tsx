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
import {
  ArrowLeft,
  CheckCircle,
  MailCheck,
  Moon,
  ShieldPlus,
  Sun,
} from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AppLogo } from '../components/AppLogo';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export const SignUpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { signUp } = useAuth();

  const initialEmail = route.params?.email || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const clearMessages = () => {
    setFormError(null);
    setFormSuccess(null);
  };

  const isValidEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(value);
  };

  const passwordRules = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordStrong =
    passwordRules.minLength &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number &&
    passwordRules.special;

  const renderPasswordRule = (label: string, passed: boolean) => (
    <View style={styles.passwordRuleRow}>
      <Text
        style={[
          styles.passwordRuleIcon,
          {
            color: passed
              ? theme.colors.status.success
              : theme.colors.text.secondary,
          },
        ]}
      >
        {passed ? '✓' : '•'}
      </Text>

      <Text
        style={[
          styles.passwordRule,
          {
            color: passed
              ? theme.colors.status.success
              : theme.colors.text.secondary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  const handleSignUp = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password.trim() || !confirmPassword.trim()) {
      setFormSuccess(null);
      setFormError('All fields are required.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setFormSuccess(null);
      setFormError('This is not a valid email address.');
      return;
    }

    if (!isPasswordStrong) {
      setFormSuccess(null);
      setFormError(
        'Password must include uppercase, lowercase, number, special character, and at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setFormSuccess(null);
      setFormError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setFormSuccess(null);

    const result = await signUp({
      name: cleanName,
      email: cleanEmail,
      password,
    });

    setIsLoading(false);

    if (!result.success) {
      if (result.code === 'otp_sent') {
        setFormSuccess('OTP sent. Please verify your email.');

        redirectTimer.current = setTimeout(() => {
          navigation.replace('OtpVerification', { email: result.email || cleanEmail });
        }, 800);

        return;
      }

      if (result.code === 'invalid_email' || result.code === 'invalid_email_domain') {
        setFormError(result.message || 'This email address cannot be used for registration.');
        return;
      }

      if (result.code === 'weak_password') {
        setFormError(
          'Password must include uppercase, lowercase, number, special character, and at least 8 characters.'
        );
        return;
      }

      if (result.code === 'account_exists') {
        setFormError('Account already exists. Please login.');

        redirectTimer.current = setTimeout(() => {
          navigation.replace('Login');
        }, 1200);

        return;
      }

      setFormError(result.message || 'Signup failed.');
      return;
    }

    setFormSuccess('Account created successfully. Redirecting...');
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
              <AppLogo size={86} />
            </View>

            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Create account
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Request access to the forensic workspace
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={17} color={theme.colors.text.secondary} />
              <Text style={[styles.backText, { color: theme.colors.text.secondary }]}>
                Back to Login
              </Text>
            </TouchableOpacity>

            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.surfaceHighlight }]}>
                <ShieldPlus size={22} color={theme.colors.primary} />
              </View>

              <View style={styles.cardHeaderText}>
                <Text style={[styles.signupHeader, { color: theme.colors.text.primary }]}>
                  Investigator sign up
                </Text>

                <Text style={[styles.signupSubtext, { color: theme.colors.text.secondary }]}>
                  Create your investigator account to access the system.
                </Text>
              </View>
            </View>

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={(value) => {
                setName(value);
                clearMessages();
              }}
            />

            <Input
              label="Email Address"
              placeholder="Enter valid email address"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearMessages();
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Input
              label="Password"
              placeholder="Example: Faheem@123"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearMessages();
              }}
              secureTextEntry
            />

            <View
              style={[
                styles.passwordRulesBox,
                {
                  backgroundColor: theme.colors.surfaceHighlight,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.passwordRulesHeader}>
                <CheckCircle
                  size={15}
                  color={
                    isPasswordStrong
                      ? theme.colors.status.success
                      : theme.colors.text.secondary
                  }
                />

                <Text
                  style={[
                    styles.passwordRulesTitle,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  Password must contain:
                </Text>
              </View>

              {renderPasswordRule('At least 8 characters', passwordRules.minLength)}
              {renderPasswordRule('One uppercase letter', passwordRules.uppercase)}
              {renderPasswordRule('One lowercase letter', passwordRules.lowercase)}
              {renderPasswordRule('One number', passwordRules.number)}
              {renderPasswordRule('One special character', passwordRules.special)}
            </View>

            <Input
              label="Confirm Password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                clearMessages();
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
                <MailCheck size={16} color={theme.colors.status.success} />
                <Text style={[styles.messageText, { color: theme.colors.status.success }]}>
                  {formSuccess}
                </Text>
              </View>
            ) : null}

            <Button
              title="Send OTP"
              onPress={handleSignUp}
              isLoading={isLoading}
              style={styles.signupButton}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity
              style={styles.loginRow}
              onPress={() => navigation.replace('Login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.loginText, { color: theme.colors.text.secondary }]}>
                Already have an account?
              </Text>

              <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
                Login
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
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  formCard: {
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 22,
    gap: 6,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupHeader: {
    fontSize: 22,
    fontWeight: '800',
  },
  signupSubtext: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  passwordRulesBox: {
    marginTop: -6,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  passwordRulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  passwordRulesTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  passwordRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  passwordRuleIcon: {
    width: 18,
    fontSize: 12,
    fontWeight: '900',
  },
  passwordRule: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  messageBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  signupButton: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 22,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '900',
  },
});
