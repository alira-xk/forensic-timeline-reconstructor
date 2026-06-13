import React, { useState } from 'react';
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
import { MailCheck, ArrowLeft } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage('');
      setErrorMessage('Email is required.');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('');
      setErrorMessage('');

      const result = await requestPasswordReset(cleanEmail);
      if (!result.success) {
        throw new Error(result.message || 'Failed to send reset code.');
      }

      setMessage(result.message || 'Reset code sent. Check your email.');
      navigation.navigate('ResetPassword', { email: cleanEmail });
    } catch (error: any) {
      setMessage('');
      setErrorMessage(error.message || 'Unable to request reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper style={{ backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color={theme.colors.text.secondary} />
            <Text style={[styles.backText, { color: theme.colors.text.secondary }]}>Back</Text>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.headerRow}>
              <MailCheck size={22} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>Forgot Password</Text>
            </View>

            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>Enter your email to receive a 6-digit reset code.</Text>

            <Input
              label="Email Address"
              placeholder="Enter registered email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setErrorMessage('');
                setMessage('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {errorMessage ? (
              <View style={[styles.messageBox, { backgroundColor: `${theme.colors.status.error}12`, borderColor: theme.colors.status.error }]}>
                <Text style={[styles.messageText, { color: theme.colors.status.error }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {message ? (
              <View style={[styles.messageBox, { backgroundColor: `${theme.colors.status.success}12`, borderColor: theme.colors.status.success }]}>
                <Text style={[styles.messageText, { color: theme.colors.status.success }]}>{message}</Text>
              </View>
            ) : null}

            <Button title="Send Reset Code" onPress={submit} isLoading={isLoading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 520,
    alignSelf: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    alignSelf: 'stretch',
    minWidth: 0,
    ...Platform.select({ web: { boxSizing: 'border-box' } as any }),
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  messageText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
