import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, FolderPlus } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
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
        status: 'open',
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

          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Case Information
            </Text>

            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              This case will be saved in MongoDB and used for evidence upload,
              metadata extraction, and timeline reconstruction.
            </Text>

            <Input
              label="CASE TITLE"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Suspicious Login Investigation"
            />

            <Input
              label="CASE DESCRIPTION"
              value={description}
              onChangeText={setDescription}
              placeholder="Write a short description about this investigation..."
              multiline
              textAlignVertical="top"
              style={styles.textArea}
            />

            <View style={styles.actions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => navigation.goBack()}
                disabled={loading}
                style={styles.actionButton}
              />

              <Button
                title="Create Case"
                onPress={handleCreateCase}
                isLoading={loading}
                style={styles.actionButton}
              />
            </View>
          </Card>
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
    borderRadius: 20,
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
  textArea: {
    minHeight: 130,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
  },
  actionButton: {
    minWidth: 140,
  },
});
