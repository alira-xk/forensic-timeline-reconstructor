import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, FolderPlus } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { createCase } from '../services/caseService';

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

      await createCase({
        title: title.trim(),
        description: description.trim(),
        status: 'Active',
      });

      Alert.alert('Success', 'Case created successfully.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create case.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ChevronLeft size={20} color={theme.colors.text.secondary} />
            <Text style={[styles.backText, { color: theme.colors.text.secondary }]}>
              Back to Cases
            </Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary }]}>
              <FolderPlus size={28} color="#FFFFFF" />
            </View>

            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                Create Case
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                Create an investigation case before uploading evidence files.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Case Information
            </Text>

            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              This case will be saved in MongoDB and used for evidence upload,
              metadata extraction, and timeline reconstruction.
            </Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                CASE TITLE
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Suspicious Login Investigation"
                placeholderTextColor={theme.colors.text.secondary}
                style={[
                  styles.input,
                  {
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                CASE DESCRIPTION
              </Text>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Write a short description about this investigation..."
                placeholderTextColor={theme.colors.text.secondary}
                multiline
                textAlignVertical="top"
                style={[
                  styles.textArea,
                  {
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => navigation.goBack()}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelText, { color: theme.colors.text.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateCase}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createText}>Create Case</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
    marginBottom: 24,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
  },
  textArea: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  createButton: {
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
    minWidth: 140,
    alignItems: 'center',
  },
  createText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});