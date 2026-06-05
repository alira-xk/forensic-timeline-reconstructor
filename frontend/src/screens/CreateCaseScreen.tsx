import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, CheckCircle, Database } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useTheme } from '../theme/ThemeContext';
import { createCase } from '../services/caseService';
import { RootStackParamList, MainTabParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCase'>;

export const CreateCaseScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateCase = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Case title is required.');
      return;
    }

    try {
      setLoading(true);
      const newCase = await createCase({
        title: title.trim(),
        description: description.trim(),
      });
      navigation.navigate('CaseDetail', { caseId: newCase._id });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper fullWidth withSidebar={true}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color={theme.colors.text.secondary} />
            <Text style={[styles.backText, { color: theme.colors.text.secondary }]}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: `${theme.colors.primary}1A` }]}>
              <Database size={28} color={theme.colors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Initiate Investigation
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              Create a secure, isolated container for your forensic artifacts and timelines.
            </Text>
          </View>

          <Card glass style={styles.formCard}>
            <Input
              label="Case Title"
              placeholder="e.g. Operation Lighthouse, Incident #9921"
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
              editable={!loading}
            />

            <Input
              label="Case Description (Optional)"
              placeholder="Provide a brief summary of the investigation scope..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!loading}
              textAlignVertical="top"
              containerStyle={{ marginTop: 8 }}
              style={{ minHeight: 100 }}
            />

            <View style={styles.infoBox}>
              <CheckCircle size={16} color={theme.colors.status.success} style={{ marginRight: 8 }} />
              <Text style={[styles.infoText, { color: theme.colors.text.muted }]}>
                Data is encrypted and logged for auditing upon creation.
              </Text>
            </View>

            <Button
              title="Create Case Workspace"
              onPress={handleCreateCase}
              isLoading={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
    textAlign: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '80%',
  },
  formCard: {
    padding: 32,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
  submitBtn: {
    marginTop: 8,
  },
});
