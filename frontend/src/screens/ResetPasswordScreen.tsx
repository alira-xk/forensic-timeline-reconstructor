import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Lock } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { API_BASE_URL } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const resetEmail = route.params?.email?.trim().toLowerCase() || '';
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (!token.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail || undefined, token: token.trim(), newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      Alert.alert('Password Updated', 'You can now log in with your new password.');
      navigation.replace('Login');
    } catch (error: any) {
      Alert.alert('Reset Failed', error.message || 'Unable to reset password.');
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
              <Lock size={22} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>Reset Password</Text>
            </View>

            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Enter the 6-digit reset code sent to your email.
            </Text>

            <Input
              label="Reset Code"
              placeholder="Enter 6-digit code"
              value={token}
              onChangeText={(value) => setToken(value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Input
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Button title="Reset Password" onPress={submit} isLoading={isLoading} />
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
});
