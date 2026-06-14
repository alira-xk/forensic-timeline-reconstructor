import React, { useState } from 'react';
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
import { ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AppLogo } from '../components/AppLogo';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerification'>;

export const OtpVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { verifyOtp, resendOtp } = useAuth();
  const { width } = useWindowDimensions();

  const { email, purpose = 'signup' } = route.params;
  const isSignInVerification = purpose === 'signin';

  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setFormError(null);
    setFormSuccess(null);
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otpCode.trim();

    if (!cleanOtp) {
      setFormError('Please enter the OTP code.');
      setFormSuccess(null);
      return;
    }

    if (cleanOtp.length !== 6) {
      setFormError('OTP code must be 6 digits.');
      setFormSuccess(null);
      return;
    }

    setVerifying(true);
    setFormError(null);
    setFormSuccess(null);

    const result = await verifyOtp(email, cleanOtp);

    setVerifying(false);

    if (!result.success) {
      setFormError(result.message || 'OTP verification failed.');
      return;
    }

    setFormSuccess(
      isSignInVerification
        ? 'Device verified. Opening your dashboard...'
        : 'Account verified. Opening your dashboard...'
    );
  };

  const handleResendOtp = async () => {
    setResending(true);
    setFormError(null);
    setFormSuccess(null);

    const result = await resendOtp(email);

    setResending(false);

    if (!result.success) {
      setFormError(result.message || 'Failed to resend OTP.');
      return;
    }

    setFormSuccess('OTP resent successfully. Please check your email.');
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <AppLogo size={86} />

            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              {isSignInVerification ? 'VERIFY DEVICE' : 'VERIFY EMAIL'}
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              {isSignInVerification
                ? 'Confirm this new device with the code sent to your email.'
                : 'Enter the 6-digit OTP sent to your email.'}
            </Text>
          </View>

          <View
            style={[
              styles.formCard,
              {
                width: Math.min(430, Math.max(280, width - 48)),
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
                Back
              </Text>
            </TouchableOpacity>

            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.surfaceHighlight }]}>
                <MailCheck size={22} color={theme.colors.primary} />
              </View>

              <View style={styles.cardHeaderText}>
                <Text style={[styles.verifyHeader, { color: theme.colors.text.primary }]}>
                  {isSignInVerification ? 'Security Verification' : 'OTP Verification'}
                </Text>

                <Text style={[styles.verifySubtext, { color: theme.colors.text.secondary }]}>
                  Code sent to {email}
                </Text>
              </View>
            </View>

            <Input
              label="OTP Code"
              placeholder="Enter 6-digit OTP"
              value={otpCode}
              onChangeText={(value) => {
                const numericValue = value.replace(/[^0-9]/g, '');
                setOtpCode(numericValue);
                clearMessages();
              }}
              keyboardType="number-pad"
              maxLength={6}
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
                <ShieldCheck size={16} color={theme.colors.status.success} />
                <Text style={[styles.messageText, { color: theme.colors.status.success }]}>
                  {formSuccess}
                </Text>
              </View>
            ) : null}

            <Button
              title={isSignInVerification ? 'Verify and Sign In' : 'Verify Account'}
              onPress={handleVerifyOtp}
              isLoading={verifying}
              style={styles.primaryButton}
            />

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOtp}
              disabled={resending || verifying}
              activeOpacity={0.8}
            >
              <Text style={[styles.resendText, { color: theme.colors.primary }]}>
                {resending ? 'Sending OTP...' : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.replace('Login')}
              disabled={verifying || resending}
              activeOpacity={0.8}
            >
              <Text style={[styles.loginText, { color: theme.colors.text.secondary }]}>
                Already verified?
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
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  formCard: {
    alignSelf: 'center',
    maxWidth: 430,
    minWidth: 0,
    flexShrink: 1,
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
    ...Platform.select({ web: { boxSizing: 'border-box' } as any }),
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
    minWidth: 0,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyHeader: {
    fontSize: 22,
    fontWeight: '900',
  },
  verifySubtext: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  messageBanner: {
    borderWidth: 1,
    borderRadius: 14,
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
  primaryButton: {
    marginTop: 4,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '900',
  },
  loginButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
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
