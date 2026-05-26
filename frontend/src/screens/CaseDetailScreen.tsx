import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Cpu,
  File,
  FileText,
  FolderOpen,
  Hash,
  RefreshCcw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { getCaseById, CaseItem, deleteCaseById } from '../services/caseService';
import {
  EvidenceFile,
  getFilesByCase,
  uploadEvidenceFile,
} from '../services/fileService';
import { extractMetadataForCase } from '../services/extractionService';
import {
  getTimelineByCase,
  TimelineEvent,
} from '../services/timelineService';

type Props = NativeStackScreenProps<RootStackParamList, 'CaseDetail'>;

export const CaseDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { caseId } = route.params;
  const { theme } = useTheme();

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const totalFiles = files.length;
  const processedFiles = files.filter((file) => file.status === 'PROCESSED').length;
  const pendingFiles = files.filter((file) => file.status === 'PENDING').length;
  const failedFiles = files.filter((file) => file.status === 'FAILED').length;
  const totalEvents = timelineEvents.length;

  const loadCaseDetails = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const [caseInfo, evidenceFiles, timelineData] = await Promise.all([
        getCaseById(caseId),
        getFilesByCase(caseId),
        getTimelineByCase(caseId),
      ]);

      setCaseData(caseInfo);
      setFiles(evidenceFiles);
      setTimelineEvents(timelineData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load case details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCaseDetails(true);
    }, [caseId])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCaseDetails(false);
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*',
          'text/plain',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);

      await uploadEvidenceFile(caseId, result.assets[0]);

      Alert.alert('Success', 'Evidence file uploaded successfully.');
      await loadCaseDetails(false);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload evidence file.');
    } finally {
      setUploading(false);
    }
  };

  const handleExtraction = async () => {
    try {
      if (files.length === 0) {
        Alert.alert('No Evidence', 'Please upload at least one evidence file first.');
        return;
      }

      setExtracting(true);

      const result = await extractMetadataForCase(caseId);

      Alert.alert(
        'Extraction Complete',
        `Files processed: ${result.extractedFiles}\nEvents created: ${result.eventsCreated}`
      );

      await loadCaseDetails(false);
    } catch (error: any) {
      Alert.alert('Extraction Failed', error.message || 'Failed to extract metadata.');
    } finally {
      setExtracting(false);
    }
  };

  const deleteCurrentCase = async () => {
  try {
    setDeleting(true);

    await deleteCaseById(caseId);

    Alert.alert('Deleted', 'Case deleted successfully.');
    navigation.goBack();
  } catch (error: any) {
    Alert.alert('Delete Failed', error.message || 'Failed to delete case.');
  } finally {
    setDeleting(false);
  }
};

const handleDeleteCase = () => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      'Are you sure you want to delete this case? This will also delete all evidence files and timeline events.'
    );

    if (confirmed) {
      deleteCurrentCase();
    }

    return;
  }

  Alert.alert(
    'Delete Case',
    'Are you sure you want to delete this case? This will also delete all evidence files and timeline events.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: deleteCurrentCase,
      },
    ]
  );
};
  const goToTimeline = () => {
    navigation.navigate('Timeline', { caseId });
  };

  const formatDate = (dateValue?: string) => {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleDateString();
  };

  const formatBytes = (bytes: number) => {
    if (!bytes && bytes !== 0) {
      return 'N/A';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: EvidenceFile['status']) => {
    if (status === 'PROCESSED') {
      return theme.colors.status.success;
    }

    if (status === 'FAILED') {
      return theme.colors.status.error;
    }

    if (status === 'PROCESSING') {
      return theme.colors.status.warning;
    }

    return theme.colors.primary;
  };

  const getStatusIcon = (status: EvidenceFile['status']) => {
    if (status === 'PROCESSED') {
      return <CheckCircle size={16} color={theme.colors.status.success} />;
    }

    if (status === 'FAILED') {
      return <XCircle size={16} color={theme.colors.status.error} />;
    }

    if (status === 'PROCESSING') {
      return <Clock size={16} color={theme.colors.status.warning} />;
    }

    return <FileText size={16} color={theme.colors.primary} />;
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    accentColor: string
  ) => (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.statIconBox, { backgroundColor: `${accentColor}18` }]}>
        {icon}
      </View>

      <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
        {title}
      </Text>

      <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
        {value}
      </Text>
    </View>
  );

  const renderFile = ({ item }: { item: EvidenceFile }) => (
    <View
      style={[
        styles.fileCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.fileIcon, { backgroundColor: theme.colors.surfaceHighlight }]}>
        <File size={22} color={theme.colors.primary} />
      </View>

      <View style={styles.fileInfo}>
        <View style={styles.fileTitleRow}>
          <Text
            numberOfLines={1}
            style={[styles.fileName, { color: theme.colors.text.primary }]}
          >
            {item.originalName}
          </Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(item.status)}22` },
            ]}
          >
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={[styles.fileMeta, { color: theme.colors.text.secondary }]}>
          Type: {item.fileType} • Size: {formatBytes(item.size)} • Uploaded: {formatDate(item.createdAt)}
        </Text>

        <View style={styles.hashRow}>
          <Hash size={13} color={theme.colors.text.muted} />
          <Text
            numberOfLines={1}
            style={[styles.hashText, { color: theme.colors.text.muted }]}
          >
            SHA-256: {item.hash}
          </Text>
        </View>

        {item.errorReason ? (
          <Text style={[styles.errorReason, { color: theme.colors.status.error }]}>
            {item.errorReason}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper withSidebar>
        <View style={[styles.centerState, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
            Loading case details...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper withSidebar>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color={theme.colors.text.secondary} />
            <Text style={[styles.backText, { color: theme.colors.text.secondary }]}>
              Back to Cases
            </Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: theme.colors.surfaceHighlight }]}>
              <FolderOpen size={28} color={theme.colors.primary} />
            </View>

            <View style={styles.headerText}>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                CASE DETAIL
              </Text>

              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                {caseData?.title || 'Case'}
              </Text>

              <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                {caseData?.description || 'No description provided.'}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {renderStatCard(
              'Evidence Files',
              totalFiles,
              <FileText size={20} color={theme.colors.primary} />,
              theme.colors.primary
            )}

            {renderStatCard(
              'Processed',
              processedFiles,
              <CheckCircle size={20} color={theme.colors.status.success} />,
              theme.colors.status.success
            )}

            {renderStatCard(
              'Pending',
              pendingFiles,
              <Clock size={20} color={theme.colors.status.warning} />,
              theme.colors.status.warning
            )}

            {renderStatCard(
              'Failed',
              failedFiles,
              <AlertTriangle size={20} color={theme.colors.status.error} />,
              theme.colors.status.error
            )}

            {renderStatCard(
              'Timeline Events',
              totalEvents,
              <BarChart3 size={20} color={theme.colors.primary} />,
              theme.colors.primary
            )}
          </View>

          <View
            style={[
              styles.actionPanel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Evidence Actions
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                Upload evidence, run metadata extraction, review timeline events, or delete this case.
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleUpload}
                disabled={uploading || deleting}
                activeOpacity={0.85}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Upload size={17} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Upload Evidence</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={handleExtraction}
                disabled={extracting || deleting}
                activeOpacity={0.85}
              >
                {extracting ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <>
                    <Cpu size={17} color={theme.colors.text.primary} />
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                      Extract Metadata
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={goToTimeline}
                disabled={deleting}
                activeOpacity={0.85}
              >
                <FileText size={17} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  View Timeline
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: theme.colors.status.error }]}
                onPress={handleDeleteCase}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator color={theme.colors.status.error} />
                ) : (
                  <>
                    <Trash2 size={17} color={theme.colors.status.error} />
                    <Text style={[styles.dangerButtonText, { color: theme.colors.status.error }]}>
                      Delete Case
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { borderColor: theme.colors.border }]}
                onPress={() => loadCaseDetails(true)}
                disabled={deleting}
                activeOpacity={0.85}
              >
                <RefreshCcw size={17} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Evidence Files
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
              Files are stored locally and verified using SHA-256 hash.
            </Text>
          </View>

          {files.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <FileText size={34} color={theme.colors.text.muted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                No evidence uploaded yet
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                Upload a PDF, DOCX, image, TXT, or LOG file to begin timeline reconstruction.
              </Text>
            </View>
          ) : (
            <FlatList
              data={files}
              renderItem={renderFile}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.filesList}
            />
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 44,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 22,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
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
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 5,
  },
  actionPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  dangerButton: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filesHeader: {
    marginBottom: 14,
  },
  filesList: {
    gap: 12,
  },
  fileCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fileInfo: {
    flex: 1,
  },
  fileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  fileMeta: {
    fontSize: 12,
    marginTop: 6,
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  hashText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  errorReason: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '700',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 14,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    marginTop: 10,
    fontSize: 14,
  },
});