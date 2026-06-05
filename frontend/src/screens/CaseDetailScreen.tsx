import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  LayoutChangeEvent,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Download,
  File,
  FileOutput,
  FileText,
  FolderOpen,
  Hash,
  History,
  Lock,
  MessageSquare,
  Network,
  PlayCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Star,
  Trash2,
  Unlock,
  Upload,
  XCircle,
} from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import {
  getCaseById,
  CaseItem,
  ChainOfCustodyEntry,
  deleteCaseById,
  getChainOfCustody,
  updateCaseById,
} from '../services/caseService';
import {
  EvidenceFile,
  deleteEvidenceFile,
  getFileDownloadUrl,
  getFilePreviewUrl,
  getFilesByCase,
  getTextFilePreview,
  uploadEvidenceFiles,
} from '../services/fileService';
import {
  extractMetadataForFile,
  extractMetadataForCase,
  getExtractionStatus,
} from '../services/extractionService';
import {
  getTimelineByCase,
  TimelineEvent,
  toggleTimelineBookmark,
} from '../services/timelineService';
import {
  createInvestigationNote,
  deleteInvestigationNote,
  FindingType,
  getNotesByCase,
  InvestigationNote,
} from '../services/noteService';
import { exportCaseReportPdf } from '../services/exportService';
import {
  AiCaseAnalysis,
  generateAiCaseSummary,
} from '../services/aiService';
import { confirmDialog } from '../utils/confirm';

type Props = NativeStackScreenProps<RootStackParamList, 'CaseDetail'>;

export const CaseDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { caseId } = route.params;
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionPositions = useRef<Record<'notes' | 'ai' | 'custody', number>>({
    notes: 0,
    ai: 0,
    custody: 0,
  });

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [custodyEntries, setCustodyEntries] = useState<ChainOfCustodyEntry[]>([]);
  const [notes, setNotes] = useState<InvestigationNote[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AiCaseAnalysis | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiProvider, setAiProvider] = useState('');
  const [aiError, setAiError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedFindingType, setSelectedFindingType] = useState<FindingType>('general');
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState('');
  const [selectedFileTextPreview, setSelectedFileTextPreview] = useState('');
  const [selectedFileNoteText, setSelectedFileNoteText] = useState('');
  const [loadingFilePreview, setLoadingFilePreview] = useState(false);
  const [creatingFileNote, setCreatingFileNote] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const [buildingReport, setBuildingReport] = useState(false);
  const [generatingAiSummary, setGeneratingAiSummary] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCustodyOpen, setIsCustodyOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  const totalFiles = files.length;
  const processedFiles = files.filter((file) => file.status === 'processed').length;
  const pendingFiles = files.filter((file) => file.status === 'pending').length;
  const failedFiles = files.filter((file) => file.status === 'failed').length;
  const totalEvents = timelineEvents.length;
  const isCaseClosed = caseData?.status === 'closed';
  const bookmarkedEvents = timelineEvents.filter((event) => event.isBookmarked);
  const selectedFileEvents = selectedFile
    ? timelineEvents.filter((event) => event.fileRecord?._id === selectedFile._id)
    : [];
  const selectedFileNotes = selectedFile
    ? notes.filter((note) => note.fileRecord?._id === selectedFile._id)
    : [];
  const fileEventCounts = useMemo(() => {
    return timelineEvents.reduce<Record<string, number>>((counts, event) => {
      const fileId = event.fileRecord?._id;
      if (!fileId) {
        return counts;
      }

      counts[fileId] = (counts[fileId] || 0) + 1;
      return counts;
    }, {});
  }, [timelineEvents]);
  const duplicateHashCounts = useMemo(() => {
    return files.reduce<Record<string, number>>((counts, file) => {
      if (!file.sha256Hash) {
        return counts;
      }

      counts[file.sha256Hash] = (counts[file.sha256Hash] || 0) + 1;
      return counts;
    }, {});
  }, [files]);
  const fileRiskItems = useMemo(() => {
    return files
      .map((file) => {
        const reasons: string[] = [];
        let score = 0;
        const relatedEvents = fileEventCounts[file._id] || 0;

        if (file.status === 'failed') {
          score += 38;
          reasons.push('Extraction failed');
        }

        if (file.status === 'processing') {
          score += 18;
          reasons.push('Extraction still running');
        }

        if (file.status === 'pending') {
          score += 14;
          reasons.push('Metadata not extracted yet');
        }

        if (!file.sha256Hash) {
          score += 28;
          reasons.push('Missing SHA-256 hash');
        }

        if (file.errorReason) {
          score += 18;
          reasons.push(file.errorReason);
        }

        if (file.status === 'processed' && relatedEvents === 0) {
          score += 18;
          reasons.push('No timeline events extracted');
        }

        if (file.sha256Hash && duplicateHashCounts[file.sha256Hash] > 1) {
          score += 16;
          reasons.push('Duplicate hash appears in this case');
        }

        if (file.fileSize === 0) {
          score += 20;
          reasons.push('Zero-byte evidence file');
        }

        return {
          file,
          score: Math.min(score, 100),
          reasons: reasons.length ? reasons : ['No obvious risk indicators'],
          relatedEvents,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [duplicateHashCounts, fileEventCounts, files]);
  const caseRiskScore = useMemo(() => {
    if (!fileRiskItems.length) {
      return 0;
    }

    const fileAverage = fileRiskItems.reduce((sum, item) => sum + item.score, 0) / fileRiskItems.length;
    const failedWeight = totalFiles ? (failedFiles / totalFiles) * 28 : 0;
    const pendingWeight = totalFiles ? (pendingFiles / totalFiles) * 12 : 0;
    const noteWeight = notes.filter((note) => note.findingType === 'suspicious' || note.findingType === 'contradiction').length * 6;

    return Math.min(Math.round(fileAverage + failedWeight + pendingWeight + noteWeight), 100);
  }, [failedFiles, fileRiskItems, notes, pendingFiles, totalFiles]);
  const riskTone =
    caseRiskScore >= 70
      ? theme.colors.status.error
      : caseRiskScore >= 38
        ? theme.colors.status.warning
        : theme.colors.status.success;
  const riskLabel =
    caseRiskScore >= 70
      ? 'High Risk'
      : caseRiskScore >= 38
        ? 'Needs Review'
        : 'Low Risk';
  const sortedTimelineEvents = useMemo(() => {
    return [...timelineEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [timelineEvents]);
  const suspiciousNotes = notes.filter(
    (note) => note.findingType === 'suspicious' || note.findingType === 'contradiction' || note.findingType === 'needs_review'
  );
  const topRiskFiles = fileRiskItems.slice(0, 3);
  const findingOptions: Array<{ value: FindingType; label: string }> = [
    { value: 'general', label: 'General' },
    { value: 'suspicious', label: 'Suspicious' },
    { value: 'needs_review', label: 'Needs Review' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'contradiction', label: 'Contradiction' },
    { value: 'report', label: 'Report' },
  ];

  const loadCaseDetails = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const [caseInfo, evidenceFiles, timelineData, custodyData, noteData] = await Promise.all([
        getCaseById(caseId),
        getFilesByCase(caseId),
        getTimelineByCase(caseId),
        getChainOfCustody(caseId),
        getNotesByCase(caseId),
      ]);

      setCaseData(caseInfo);
      setFiles(evidenceFiles);
      setTimelineEvents(timelineData);
      setCustodyEntries(custodyData);
      setNotes(noteData);
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

  const rememberSectionPosition = (
    section: 'notes' | 'ai' | 'custody',
    event: LayoutChangeEvent
  ) => {
    sectionPositions.current[section] = event.nativeEvent.layout.y;
  };

  const scrollToSection = (section: 'notes' | 'ai' | 'custody') => {
    requestAnimationFrame(() => {
      const y = Math.max(sectionPositions.current[section] - 18, 0);
      scrollRef.current?.scrollTo({ y, animated: true });
    });
  };

  const openNotesSection = () => {
    setIsNotesOpen(true);
    scrollToSection('notes');
  };

  const openCustodySection = () => {
    setIsCustodyOpen(true);
    scrollToSection('custody');
  };

  const openAiSection = () => {
    setIsAiOpen(true);
    scrollToSection('ai');
  };

  const waitForExtractionToFinish = async () => {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const status = await getExtractionStatus(caseId);
      await loadCaseDetails(false);

      if (status.isComplete) {
        if (status.failed > 0) {
          Alert.alert(
            'Extraction Finished',
            `${status.processed} file(s) processed, ${status.failed} failed. Check the file status for details.`
          );
        }
        return;
      }
    }

    Alert.alert(
      'Extraction Still Running',
      'Metadata extraction is taking longer than usual. Use the refresh button in a moment.'
    );
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);

      await uploadEvidenceFiles(caseId, result.assets);

      const count = result.assets.length;
      Alert.alert('Success', `${count} evidence file${count > 1 ? 's' : ''} uploaded successfully.`);
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
        'Extraction Started',
        result.filesQueued
          ? `Files queued for extraction: ${result.filesQueued}`
          : result.message || 'Extraction request sent.'
      );

      await loadCaseDetails(false);
      if (result.status === 'processing' || result.filesQueued) {
        await waitForExtractionToFinish();
      }
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
  (async () => {
    const confirmed = await confirmDialog(
      'Delete Case',
      'Are you sure you want to delete this case? This will also delete all evidence files and timeline events.'
    );

    if (confirmed) deleteCurrentCase();
  })();
};

  const updateCaseStatus = async (status: CaseItem['status']) => {
    try {
      setUpdatingStatus(true);
      const updatedCase = await updateCaseById(caseId, { status });
      setCaseData(updatedCase);
      Alert.alert(
        status === 'closed' ? 'Case Closed' : 'Case Reopened',
        status === 'closed'
          ? 'This case has been marked as closed.'
          : 'This case has been reopened.'
      );
    } catch (error: any) {
      Alert.alert('Status Update Failed', error.message || 'Failed to update case status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleToggleCaseClosed = () => {
    const nextStatus: CaseItem['status'] = isCaseClosed ? 'open' : 'closed';

    (async () => {
      const confirmed = await confirmDialog(
        isCaseClosed ? 'Reopen Case' : 'Close Case',
        isCaseClosed
          ? 'Reopen this case so evidence work can continue?'
          : 'Close this case? You can reopen it later if more evidence arrives.'
      );

      if (confirmed) {
        updateCaseStatus(nextStatus);
      }
    })();
  };

  const handleCreateNote = async () => {
    const body = noteText.trim();
    if (!body) {
      Alert.alert('Note Required', 'Write a note before adding it to the case.');
      return;
    }

    try {
      setCreatingNote(true);
      const note = await createInvestigationNote({
        caseId,
        body,
        findingType: selectedFindingType,
        tags: selectedFindingType === 'general' ? [] : [selectedFindingType],
      });
      setNotes((currentNotes) => [note, ...currentNotes]);
      setNoteText('');
    } catch (error: any) {
      Alert.alert('Note Failed', error.message || 'Failed to add investigation note.');
    } finally {
      setCreatingNote(false);
    }
  };

  const handleBuildReport = async () => {
    try {
      setBuildingReport(true);
      const result = await exportCaseReportPdf(caseId);
      Alert.alert(
        'Report Ready',
        result.fileUri
          ? `${result.filename} has been saved.`
          : `${result.filename} has been downloaded.`
      );
    } catch (error: any) {
      Alert.alert('Report Failed', error.message || 'Failed to build case report.');
    } finally {
      setBuildingReport(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    try {
      setGeneratingAiSummary(true);
      openAiSection();
      setAiError('');
      const result = await generateAiCaseSummary(caseId);
      setAiAnalysis(result.analysis);
      setAiGeneratedAt(result.generatedAt);
      setAiModel(result.model);
      setAiProvider(result.provider || '');
    } catch (error: any) {
      const message = error.message || 'Failed to generate AI case summary.';
      setAiError(message);
      Alert.alert('AI Summary Failed', message);
    } finally {
      setGeneratingAiSummary(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    (async () => {
      const confirmed = await confirmDialog(
        'Delete Note',
        'Delete this investigation note?'
      );

      if (!confirmed) {
        return;
      }

      try {
        await deleteInvestigationNote(noteId);
        setNotes((currentNotes) => currentNotes.filter((note) => note._id !== noteId));
      } catch (error: any) {
        Alert.alert('Delete Failed', error.message || 'Failed to delete note.');
      }
    })();
  };

  const handleToggleBookmarkFromCase = async (eventId: string) => {
    try {
      const updatedEvent = await toggleTimelineBookmark(eventId);
      setTimelineEvents((currentEvents) =>
        currentEvents.map((event) =>
          event._id === eventId
            ? { ...event, isBookmarked: updatedEvent.isBookmarked }
            : event
        )
      );
    } catch (error: any) {
      Alert.alert('Bookmark Failed', error.message || 'Could not update bookmark.');
    }
  };

  const handleOpenFileDetail = async (file: EvidenceFile) => {
    setSelectedFile(file);
    setSelectedFilePreviewUrl('');
    setSelectedFileTextPreview('');
    setSelectedFileNoteText('');

    if (!['image', 'pdf', 'log', 'txt'].includes(file.fileType)) {
      return;
    }

    try {
      setLoadingFilePreview(true);
      if (file.fileType === 'log' || file.fileType === 'txt') {
        const text = await getTextFilePreview(file._id);
        setSelectedFileTextPreview(text.slice(0, 12000));
        return;
      }

      const url = await getFilePreviewUrl(file._id);
      setSelectedFilePreviewUrl(url);
    } catch (error: any) {
      Alert.alert('Preview Failed', error.message || 'Could not load file preview.');
    } finally {
      setLoadingFilePreview(false);
    }
  };

  const handleDownloadSelectedFile = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      const url = await getFileDownloadUrl(selectedFile._id);
      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert('Download Failed', error.message || 'Could not open file download.');
    }
  };

  const handleDeleteEvidenceFile = (file: EvidenceFile, event?: any) => {
    event?.stopPropagation?.();

    (async () => {
      const confirmed = await confirmDialog(
        'Remove Evidence File',
        `Remove "${file.originalName}" from this case? This will delete the stored file and its extracted timeline events.`
      );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingFileId(file._id);
        await deleteEvidenceFile(file._id);
        if (selectedFile?._id === file._id) {
          setSelectedFile(null);
          setSelectedFilePreviewUrl('');
          setSelectedFileTextPreview('');
          setSelectedFileNoteText('');
        }
        Alert.alert('Evidence Removed', `${file.originalName} was removed from this case.`);
        await loadCaseDetails(false);
      } catch (error: any) {
        Alert.alert('Remove Failed', error.message || 'Failed to remove evidence file.');
      } finally {
        setDeletingFileId('');
      }
    })();
  };

  const handleReextractSelectedFile = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      setExtracting(true);
      const fileName = selectedFile.originalName;
      await extractMetadataForFile(selectedFile._id);
      setSelectedFile(null);
      Alert.alert('Re-extraction Started', `${fileName} is being extracted again.`);
      await waitForExtractionToFinish();
    } catch (error: any) {
      Alert.alert('Re-extraction Failed', error.message || 'Failed to re-extract this file.');
    } finally {
      setExtracting(false);
    }
  };

  const handleCreateSelectedFileNote = async () => {
    if (!selectedFile) {
      return;
    }

    const body = selectedFileNoteText.trim();
    if (!body) {
      Alert.alert('Note Required', 'Write a note before adding it to this file.');
      return;
    }

    try {
      setCreatingFileNote(true);
      const note = await createInvestigationNote({
        caseId,
        fileRecord: selectedFile._id,
        body,
        findingType: 'needs_review',
        tags: ['file-note'],
      });
      setNotes((currentNotes) => [note, ...currentNotes]);
      setSelectedFileNoteText('');
    } catch (error: any) {
      Alert.alert('Note Failed', error.message || 'Failed to add file note.');
    } finally {
      setCreatingFileNote(false);
    }
  };

  const goToTimeline = () => {
    navigation.navigate('Timeline', { caseId });
  };

  const goToRelationshipGraph = () => {
    navigation.navigate('EvidenceGraph', { caseId });
  };

  const formatCaseStatus = (status?: CaseItem['status']) => {
    if (!status) {
      return 'Unknown';
    }

    return status.replace('_', ' ');
  };

  const getCaseStatusColor = (status?: CaseItem['status']) => {
    if (status === 'closed') {
      return theme.colors.text.secondary;
    }

    if (status === 'archived') {
      return theme.colors.status.warning;
    }

    return theme.colors.status.success;
  };

  const formatDate = (dateValue?: string) => {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleDateString();
  };

  const formatDateTime = (dateValue?: string) => {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleString();
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
    if (status === 'processed') {
      return theme.colors.status.success;
    }

    if (status === 'failed') {
      return theme.colors.status.error;
    }

    if (status === 'processing') {
      return theme.colors.status.warning;
    }

    return theme.colors.primary;
  };

  const getStatusIcon = (status: EvidenceFile['status']) => {
    if (status === 'processed') {
      return <CheckCircle size={16} color={theme.colors.status.success} />;
    }

    if (status === 'failed') {
      return <XCircle size={16} color={theme.colors.status.error} />;
    }

    if (status === 'processing') {
      return <Clock size={16} color={theme.colors.status.warning} />;
    }

    return <FileText size={16} color={theme.colors.primary} />;
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) {
      return theme.colors.status.error;
    }

    if (score >= 38) {
      return theme.colors.status.warning;
    }

    return theme.colors.status.success;
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
    <TouchableOpacity
      style={[
        styles.fileCard,
        {
          backgroundColor: theme.colors.panel,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={() => handleOpenFileDetail(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.fileIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
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

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={deletingFileId === item._id}
            onPress={(event) => handleDeleteEvidenceFile(item, event)}
            style={[
              styles.fileRemoveButton,
              {
                borderColor: `${theme.colors.status.error}55`,
                backgroundColor: `${theme.colors.status.error}12`,
              },
            ]}
          >
            {deletingFileId === item._id ? (
              <ActivityIndicator size="small" color={theme.colors.status.error} />
            ) : (
              <Trash2 size={15} color={theme.colors.status.error} />
            )}
          </TouchableOpacity>
        </View>

              <Text style={[styles.fileMeta, { color: theme.colors.text.secondary }]}>
                Type: {item.fileType} • Size: {formatBytes(item.fileSize)} • Uploaded: {formatDate(item.createdAt)}
              </Text>

              <View style={styles.hashRow}>
                <Hash size={13} color={theme.colors.text.muted} />
                <Text
                  numberOfLines={1}
                  style={[styles.hashText, { color: theme.colors.text.muted }]}
                >
                  SHA-256: {item.sha256Hash}
                </Text>
              </View>

        {item.errorReason ? (
          <Text style={[styles.errorReason, { color: theme.colors.status.error }]}>
            {item.errorReason}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderCustodyEntry = ({ item }: { item: ChainOfCustodyEntry }) => {
    const detailFiles = Array.isArray(item.details?.files) ? item.details.files : [];
    const hash =
      item.details?.sha256Hash ||
      detailFiles.find((file) => file?.sha256Hash)?.sha256Hash ||
      '';
    const actorName =
      typeof item.actor === 'object' && item.actor
        ? item.actor.name || item.actor.email
        : '';
    const label = String(item.label || item.action || 'Custody event');
    const summary = String(item.summary || 'Custody record captured.');

    return (
      <View style={styles.custodyRow}>
        <View
          style={[
            styles.custodyMarker,
            {
              backgroundColor: item.success
                ? `${theme.colors.status.success}22`
                : `${theme.colors.status.error}22`,
              borderColor: item.success
                ? theme.colors.status.success
                : theme.colors.status.error,
            },
          ]}
        >
          <ShieldCheck
            size={15}
            color={item.success ? theme.colors.status.success : theme.colors.status.error}
          />
        </View>

        <View
          style={[
            styles.custodyCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.custodyTitleRow}>
            <View style={styles.custodyTitleGroup}>
              <Text style={[styles.custodyLabel, { color: theme.colors.text.primary }]}>
                {label}
              </Text>
              <Text style={[styles.custodyTime, { color: theme.colors.text.secondary }]}>
                {formatDateTime(item.createdAt)}
              </Text>
            </View>

            <View
              style={[
                styles.custodyStatusBadge,
                {
                  backgroundColor: item.success
                    ? `${theme.colors.status.success}1F`
                    : `${theme.colors.status.error}1F`,
                },
              ]}
            >
              <Text
                style={[
                  styles.custodyStatusText,
                  {
                    color: item.success
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                  },
                ]}
              >
                {item.success ? 'Verified' : 'Failed'}
              </Text>
            </View>
          </View>

          <Text style={[styles.custodySummary, { color: theme.colors.text.secondary }]}>
            {summary}
          </Text>

          <View style={styles.custodyMetaGrid}>
            <Text style={[styles.custodyMeta, { color: theme.colors.text.muted }]}>
              Actor: {actorName || 'System'}
            </Text>

            {item.fileName ? (
              <Text style={[styles.custodyMeta, { color: theme.colors.text.muted }]}>
                File: {String(item.fileName)}
              </Text>
            ) : null}

            {hash ? (
              <Text
                numberOfLines={1}
                style={[styles.custodyHash, { color: theme.colors.text.muted }]}
              >
                SHA-256: {hash}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderNote = ({ item }: { item: InvestigationNote }) => (
    <View
      style={[
        styles.noteCard,
        {
          backgroundColor: theme.colors.panel,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.noteHeader}>
        <View style={styles.noteHeading}>
          <View style={[styles.noteTypeBadge, { backgroundColor: theme.colors.surfaceHighlight }]}>
            <Text style={[styles.noteTypeText, { color: theme.colors.primary }]}>
              {item.findingType.replace('_', ' ')}
            </Text>
          </View>
          <Text style={[styles.noteDate, { color: theme.colors.text.muted }]}>
            {formatDateTime(item.createdAt)}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleDeleteNote(item._id)}
          style={[styles.noteDeleteButton, { borderColor: theme.colors.border }]}
        >
          <Trash2 size={14} color={theme.colors.status.error} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.noteBody, { color: theme.colors.text.primary }]}>
        {item.body}
      </Text>

      <Text style={[styles.noteAuthor, { color: theme.colors.text.secondary }]}>
        Added by {item.createdBy?.name || item.createdBy?.email || 'Investigator'}
      </Text>
    </View>
  );

  const renderAiList = (items: string[] = []) => {
    if (!items.length) {
      return (
        <Text style={[styles.aiMutedText, { color: theme.colors.text.muted }]}>
          No items identified.
        </Text>
      );
    }

    return items.map((item, index) => (
      <Text key={`${item}-${index}`} style={[styles.aiBulletText, { color: theme.colors.text.secondary }]}>
        {index + 1}. {item}
      </Text>
    ));
  };

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
        <Modal
          visible={isPresentationOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPresentationOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.presentationModal,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.presentationTopBar}>
                <View style={styles.headerText}>
                  <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                    Forensic Presentation Mode
                  </Text>
                  <Text style={[styles.presentationTitle, { color: theme.colors.text.primary }]}>
                    {caseData?.title || 'Case Briefing'}
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                    A judge-friendly story view of evidence health, risk, timeline activity, and next steps.
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setIsPresentationOpen(false)}
                  style={[styles.modalCloseButton, { borderColor: theme.colors.border }]}
                >
                  <XCircle size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <LinearGradient
                  colors={[`${theme.colors.primary}24`, `${riskTone}18`]}
                  style={[styles.presentationHero, { borderColor: theme.colors.border }]}
                >
                  <View style={styles.presentationHeroText}>
                    <Text style={[styles.presentationKicker, { color: theme.colors.primary }]}>
                      CASE #{caseId.slice(-6).toUpperCase()}
                    </Text>
                    <Text style={[styles.presentationHeadline, { color: theme.colors.text.primary }]}>
                      {riskLabel} investigation profile
                    </Text>
                    <Text style={[styles.presentationSubcopy, { color: theme.colors.text.secondary }]}>
                      {totalFiles} evidence file{totalFiles === 1 ? '' : 's'}, {totalEvents} extracted event{totalEvents === 1 ? '' : 's'}, {custodyEntries.length} custody record{custodyEntries.length === 1 ? '' : 's'}, and {notes.length} investigator note{notes.length === 1 ? '' : 's'}.
                    </Text>
                  </View>

                  <View style={[styles.presentationRiskBadge, { borderColor: riskTone }]}>
                    <Text style={[styles.presentationRiskValue, { color: riskTone }]}>
                      {caseRiskScore}
                    </Text>
                    <Text style={[styles.presentationRiskLabel, { color: theme.colors.text.secondary }]}>
                      Risk Score
                    </Text>
                  </View>
                </LinearGradient>

                <View style={styles.presentationMetricGrid}>
                  <View style={[styles.presentationMetricCard, { backgroundColor: theme.colors.panel, borderColor: theme.colors.border }]}>
                    <FileText size={19} color={theme.colors.primary} />
                    <Text style={[styles.presentationMetricValue, { color: theme.colors.text.primary }]}>
                      {processedFiles}/{totalFiles || 0}
                    </Text>
                    <Text style={[styles.presentationMetricLabel, { color: theme.colors.text.secondary }]}>
                      Evidence processed
                    </Text>
                  </View>

                  <View style={[styles.presentationMetricCard, { backgroundColor: theme.colors.panel, borderColor: theme.colors.border }]}>
                    <AlertTriangle size={19} color={failedFiles ? theme.colors.status.error : theme.colors.status.success} />
                    <Text style={[styles.presentationMetricValue, { color: theme.colors.text.primary }]}>
                      {failedFiles}
                    </Text>
                    <Text style={[styles.presentationMetricLabel, { color: theme.colors.text.secondary }]}>
                      Failed extractions
                    </Text>
                  </View>

                  <View style={[styles.presentationMetricCard, { backgroundColor: theme.colors.panel, borderColor: theme.colors.border }]}>
                    <Star size={19} color={theme.colors.status.warning} />
                    <Text style={[styles.presentationMetricValue, { color: theme.colors.text.primary }]}>
                      {bookmarkedEvents.length}
                    </Text>
                    <Text style={[styles.presentationMetricLabel, { color: theme.colors.text.secondary }]}>
                      Bookmarked events
                    </Text>
                  </View>

                  <View style={[styles.presentationMetricCard, { backgroundColor: theme.colors.panel, borderColor: theme.colors.border }]}>
                    <MessageSquare size={19} color={theme.colors.primary} />
                    <Text style={[styles.presentationMetricValue, { color: theme.colors.text.primary }]}>
                      {suspiciousNotes.length}
                    </Text>
                    <Text style={[styles.presentationMetricLabel, { color: theme.colors.text.secondary }]}>
                      Review findings
                    </Text>
                  </View>
                </View>

                <View style={styles.presentationColumns}>
                  <View style={[styles.presentationPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.presentationPanelTitle, { color: theme.colors.text.primary }]}>
                      Evidence Risk Leaderboard
                    </Text>
                    {(topRiskFiles.length ? topRiskFiles : fileRiskItems).slice(0, 4).map((item, index) => (
                      <View key={item.file._id} style={styles.presentationRiskRow}>
                        <View style={[styles.presentationRank, { backgroundColor: `${getRiskColor(item.score)}18` }]}>
                          <Text style={[styles.presentationRankText, { color: getRiskColor(item.score) }]}>
                            {index + 1}
                          </Text>
                        </View>
                        <View style={styles.headerText}>
                          <Text numberOfLines={1} style={[styles.presentationRowTitle, { color: theme.colors.text.primary }]}>
                            {item.file.originalName}
                          </Text>
                          <Text numberOfLines={2} style={[styles.presentationRowMeta, { color: theme.colors.text.secondary }]}>
                            {item.reasons.join(' - ')}
                          </Text>
                        </View>
                        <Text style={[styles.presentationRowScore, { color: getRiskColor(item.score) }]}>
                          {item.score}
                        </Text>
                      </View>
                    ))}

                    {!files.length ? (
                      <Text style={[styles.aiMutedText, { color: theme.colors.text.muted }]}>
                        No evidence uploaded yet.
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.presentationPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.presentationPanelTitle, { color: theme.colors.text.primary }]}>
                      Timeline Story Beats
                    </Text>
                    {sortedTimelineEvents.slice(0, 2).map((event) => (
                      <View key={`start-${event._id}`} style={styles.presentationStoryRow}>
                        <Clock size={16} color={theme.colors.primary} />
                        <View style={styles.headerText}>
                          <Text style={[styles.presentationRowTitle, { color: theme.colors.text.primary }]}>
                            {event.title || event.eventType}
                          </Text>
                          <Text style={[styles.presentationRowMeta, { color: theme.colors.text.secondary }]}>
                            {formatDateTime(event.timestamp)} - {event.fileRecord?.originalName || event.eventSource}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {sortedTimelineEvents.slice(-2).map((event) => (
                      <View key={`end-${event._id}`} style={styles.presentationStoryRow}>
                        <BarChart3 size={16} color={theme.colors.status.warning} />
                        <View style={styles.headerText}>
                          <Text style={[styles.presentationRowTitle, { color: theme.colors.text.primary }]}>
                            {event.title || event.eventType}
                          </Text>
                          <Text style={[styles.presentationRowMeta, { color: theme.colors.text.secondary }]}>
                            {formatDateTime(event.timestamp)} - {event.fileRecord?.originalName || event.eventSource}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {!sortedTimelineEvents.length ? (
                      <Text style={[styles.aiMutedText, { color: theme.colors.text.muted }]}>
                        Run metadata extraction to build the story beats.
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.presentationPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.presentationPanelTitle, { color: theme.colors.text.primary }]}>
                    Case Briefing Highlights
                  </Text>
                  <Text style={[styles.presentationBullet, { color: theme.colors.text.secondary }]}>
                    1. Evidence files are preserved with SHA-256 hashes for integrity tracking.
                  </Text>
                  <Text style={[styles.presentationBullet, { color: theme.colors.text.secondary }]}>
                    2. Metadata extraction converts documents, images, text, and logs into a unified forensic timeline.
                  </Text>
                  <Text style={[styles.presentationBullet, { color: theme.colors.text.secondary }]}>
                    3. Risk scoring prioritizes failed extractions, sparse timeline coverage, duplicate hashes, and investigator review items.
                  </Text>
                  <Text style={[styles.presentationBullet, { color: theme.colors.text.secondary }]}>
                    4. Chain of custody records and investigator notes keep the case explainable and auditable.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={Boolean(selectedFile)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedFile(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.fileDetailModal,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.fileInfo}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                    {selectedFile?.originalName || 'Evidence File'}
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                    Evidence detail and preview
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedFile(null)}
                  style={[styles.modalCloseButton, { borderColor: theme.colors.border }]}
                >
                  <XCircle size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {selectedFile ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.fileDetailActions}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleReextractSelectedFile}
                      disabled={extracting}
                      style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                    >
                      {extracting ? (
                        <ActivityIndicator color={theme.colors.text.primary} />
                      ) : (
                        <RefreshCcw size={16} color={theme.colors.text.primary} />
                      )}
                      <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                        Re-extract
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleDownloadSelectedFile}
                      style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                    >
                      <Download size={16} color={theme.colors.text.primary} />
                      <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                        Download
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleDeleteEvidenceFile(selectedFile)}
                      disabled={deletingFileId === selectedFile._id}
                      style={[styles.dangerButton, { borderColor: `${theme.colors.status.error}66` }]}
                    >
                      {deletingFileId === selectedFile._id ? (
                        <ActivityIndicator color={theme.colors.status.error} />
                      ) : (
                        <Trash2 size={16} color={theme.colors.status.error} />
                      )}
                      <Text style={[styles.dangerButtonText, { color: theme.colors.status.error }]}>
                        Remove File
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={[styles.detailItem, { borderColor: theme.colors.border }]}>
                      <Text style={[styles.detailLabel, { color: theme.colors.text.muted }]}>Type</Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                        {selectedFile.fileType}
                      </Text>
                    </View>
                    <View style={[styles.detailItem, { borderColor: theme.colors.border }]}>
                      <Text style={[styles.detailLabel, { color: theme.colors.text.muted }]}>Size</Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                        {formatBytes(selectedFile.fileSize)}
                      </Text>
                    </View>
                    <View style={[styles.detailItem, { borderColor: theme.colors.border }]}>
                      <Text style={[styles.detailLabel, { color: theme.colors.text.muted }]}>Status</Text>
                      <Text style={[styles.detailValue, { color: getStatusColor(selectedFile.status) }]}>
                        {selectedFile.status}
                      </Text>
                    </View>
                    <View style={[styles.detailItem, { borderColor: theme.colors.border }]}>
                      <Text style={[styles.detailLabel, { color: theme.colors.text.muted }]}>Uploaded</Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                        {formatDateTime(selectedFile.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailHashBlock, { borderColor: theme.colors.border }]}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text.muted }]}>SHA-256</Text>
                    <Text style={[styles.detailHashText, { color: theme.colors.text.primary }]}>
                      {selectedFile.sha256Hash || 'N/A'}
                    </Text>
                  </View>

                  {selectedFile.errorReason ? (
                    <Text style={[styles.errorReason, { color: theme.colors.status.error }]}>
                      {selectedFile.errorReason}
                    </Text>
                  ) : null}

                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                    Preview
                  </Text>
                  <View style={[styles.previewBox, { borderColor: theme.colors.border }]}>
                    {loadingFilePreview ? (
                      <ActivityIndicator color={theme.colors.primary} />
                    ) : selectedFile.fileType === 'image' && selectedFilePreviewUrl ? (
                      <Image source={{ uri: selectedFilePreviewUrl }} style={styles.imagePreview} resizeMode="contain" />
                    ) : selectedFile.fileType === 'pdf' && selectedFilePreviewUrl ? (
                      <TouchableOpacity activeOpacity={0.85} onPress={() => Linking.openURL(selectedFilePreviewUrl)}>
                        <Text style={[styles.previewLinkText, { color: theme.colors.primary }]}>
                          Open PDF Preview
                        </Text>
                      </TouchableOpacity>
                    ) : selectedFileTextPreview ? (
                      <Text style={[styles.textPreview, { color: theme.colors.text.secondary }]}>
                        {selectedFileTextPreview}
                      </Text>
                    ) : (
                      <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                        Preview is not available for this file type. Use Download to inspect the original evidence.
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                    Events From This File
                  </Text>
                  {selectedFileEvents.length === 0 ? (
                    <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                      No timeline events extracted from this file yet.
                    </Text>
                  ) : (
                    selectedFileEvents.slice(0, 8).map((event) => (
                      <View key={event._id} style={[styles.relatedItem, { borderColor: theme.colors.border }]}>
                        <Text style={[styles.relatedTitle, { color: theme.colors.text.primary }]}>
                          {event.title || event.eventType}
                        </Text>
                        <Text style={[styles.relatedMeta, { color: theme.colors.text.secondary }]}>
                          {formatDateTime(event.timestamp)} • {event.eventType}
                        </Text>
                      </View>
                    ))
                  )}

                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                    Notes Linked To This File
                  </Text>
                  <View style={[styles.fileNoteComposer, { borderColor: theme.colors.border }]}>
                    <TextInput
                      value={selectedFileNoteText}
                      onChangeText={setSelectedFileNoteText}
                      placeholder="Add a note to this evidence file..."
                      placeholderTextColor={theme.colors.text.muted}
                      multiline
                      style={[
                        styles.fileNoteInput,
                        {
                          color: theme.colors.text.primary,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    />
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleCreateSelectedFileNote}
                      disabled={creatingFileNote}
                      style={[styles.addNoteButton, { backgroundColor: theme.colors.primary }]}
                    >
                      {creatingFileNote ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Plus size={16} color="#FFFFFF" />
                          <Text style={styles.addNoteButtonText}>Add File Note</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {selectedFileNotes.length === 0 ? (
                    <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                      No notes are linked to this file yet.
                    </Text>
                  ) : (
                    selectedFileNotes.map((note) => (
                      <View key={note._id} style={[styles.relatedItem, { borderColor: theme.colors.border }]}>
                        <Text style={[styles.relatedTitle, { color: theme.colors.text.primary }]}>
                          {note.findingType.replace('_', ' ')}
                        </Text>
                        <Text style={[styles.relatedMeta, { color: theme.colors.text.secondary }]}>
                          {note.body}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>

        <ScrollView
          ref={scrollRef}
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

          <LinearGradient
            colors={theme.dark ? ['#111C2C', '#0C121A'] : ['#FFFFFF', '#ECF4FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { borderColor: theme.colors.border }]}
          >
            <View style={[styles.headerIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
              <FolderOpen size={28} color={theme.colors.primary} />
            </View>

            <View style={styles.headerText}>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                Case Detail
              </Text>

              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                {caseData?.title || 'Case'}
              </Text>

              <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                {caseData?.description || 'No description provided.'}
              </Text>

              <View
                style={[
                  styles.caseStatusBadge,
                  { backgroundColor: `${getCaseStatusColor(caseData?.status)}1F` },
                ]}
              >
                <Text style={[styles.caseStatusText, { color: getCaseStatusColor(caseData?.status) }]}>
                  {formatCaseStatus(caseData?.status)}
                </Text>
              </View>
            </View>
          </LinearGradient>

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

            {renderStatCard(
              'Evidence Risk',
              `${caseRiskScore}/100`,
              <ShieldCheck size={20} color={riskTone} />,
              riskTone
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
                Upload evidence, run metadata extraction, review timeline events, close, reopen, or delete this case.
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
                disabled={deleting || updatingStatus}
                activeOpacity={0.85}
              >
                <FileText size={17} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  View Timeline
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={goToRelationshipGraph}
                disabled={deleting || updatingStatus}
                activeOpacity={0.85}
              >
                <Network size={17} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  View Relationship Graph
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={() => setIsPresentationOpen(true)}
                disabled={deleting || updatingStatus}
                activeOpacity={0.85}
              >
                <PlayCircle size={17} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  Present Case
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={openCustodySection}
                disabled={deleting || updatingStatus}
                activeOpacity={0.85}
              >
                <History size={17} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  View Chain of Custody
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={openNotesSection}
                disabled={deleting || updatingStatus}
                activeOpacity={0.85}
              >
                <MessageSquare size={17} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  View Notes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={handleBuildReport}
                disabled={deleting || updatingStatus || buildingReport}
                activeOpacity={0.85}
              >
                {buildingReport ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <>
                    <FileOutput size={17} color={theme.colors.text.primary} />
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                      Build Report
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={aiAnalysis || aiError ? openAiSection : handleGenerateAiSummary}
                disabled={deleting || updatingStatus || generatingAiSummary}
                activeOpacity={0.85}
              >
                {generatingAiSummary ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <>
                    <Bot size={17} color={theme.colors.text.primary} />
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                      AI Summary
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={handleToggleCaseClosed}
                disabled={deleting || updatingStatus}
                activeOpacity={0.85}
              >
                {updatingStatus ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : isCaseClosed ? (
                  <>
                    <Unlock size={17} color={theme.colors.text.primary} />
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                      Reopen Case
                    </Text>
                  </>
                ) : (
                  <>
                    <Lock size={17} color={theme.colors.text.primary} />
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                      Close Case
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: theme.colors.status.error }]}
                onPress={handleDeleteCase}
                disabled={deleting || updatingStatus}
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

          <View
            style={[
              styles.riskPanel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.riskHeader}>
              <View style={[styles.riskScoreRing, { borderColor: riskTone, backgroundColor: `${riskTone}14` }]}>
                <Text style={[styles.riskScoreText, { color: riskTone }]}>{caseRiskScore}</Text>
                <Text style={[styles.riskScoreLabel, { color: theme.colors.text.muted }]}>RISK</Text>
              </View>

              <View style={styles.headerText}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  Evidence Risk Snapshot
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                  {riskLabel} based on extraction status, hash signals, timeline coverage, and investigator findings.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setIsPresentationOpen(true)}
                style={[styles.presentationMiniButton, { borderColor: theme.colors.border }]}
              >
                <PlayCircle size={16} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  Present
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.riskGrid}>
              {(topRiskFiles.length ? topRiskFiles : fileRiskItems.slice(0, 1)).map((item) => (
                <View
                  key={item.file._id}
                  style={[
                    styles.riskFileCard,
                    {
                      borderColor: `${getRiskColor(item.score)}55`,
                      backgroundColor: theme.colors.panel,
                    },
                  ]}
                >
                  <View style={styles.riskFileHeader}>
                    <Text
                      numberOfLines={1}
                      style={[styles.riskFileName, { color: theme.colors.text.primary }]}
                    >
                      {item.file.originalName}
                    </Text>
                    <Text style={[styles.riskFileScore, { color: getRiskColor(item.score) }]}>
                      {item.score}/100
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.riskReasonText, { color: theme.colors.text.secondary }]}>
                    {item.reasons.join(' • ')}
                  </Text>
                  <Text style={[styles.riskMetaText, { color: theme.colors.text.muted }]}>
                    {item.relatedEvents} event{item.relatedEvents === 1 ? '' : 's'} linked • {item.file.status}
                  </Text>
                </View>
              ))}

              {!files.length ? (
                <Text style={[styles.riskReasonText, { color: theme.colors.text.secondary }]}>
                  Upload evidence to generate a case risk profile.
                </Text>
              ) : null}
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
                Upload a PDF, DOC, DOCX, image, TXT, or LOG file to begin timeline reconstruction.
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

          <TouchableOpacity
            style={[
              styles.notesTogglePanel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onLayout={(event) => rememberSectionPosition('notes', event)}
            onPress={() => setIsNotesOpen((current) => !current)}
            activeOpacity={0.85}
          >
            <View style={styles.custodyHeadingRow}>
              <View style={[styles.custodyIconBox, { backgroundColor: theme.colors.surfaceHighlight }]}>
                <MessageSquare size={20} color={theme.colors.primary} />
              </View>

              <View style={styles.headerText}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  Investigator Notes
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                  {notes.length} note{notes.length === 1 ? '' : 's'} and {bookmarkedEvents.length} bookmarked event{bookmarkedEvents.length === 1 ? '' : 's'}.
                </Text>
              </View>

              {isNotesOpen ? (
                <ChevronUp size={20} color={theme.colors.text.secondary} />
              ) : (
                <ChevronDown size={20} color={theme.colors.text.secondary} />
              )}
            </View>
          </TouchableOpacity>

          {isNotesOpen ? (
            <View style={styles.notesSection}>
              <View
                style={[
                  styles.noteComposer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Add an investigation note..."
                  placeholderTextColor={theme.colors.text.muted}
                  multiline
                  style={[
                    styles.noteInput,
                    {
                      color: theme.colors.text.primary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.findingPills}
                >
                  {findingOptions.map((option) => {
                    const active = selectedFindingType === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.8}
                        onPress={() => setSelectedFindingType(option.value)}
                        style={[
                          styles.findingPill,
                          {
                            borderColor: active ? theme.colors.primary : theme.colors.border,
                            backgroundColor: active ? theme.colors.surfaceHighlight : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.findingPillText,
                            {
                              color: active ? theme.colors.primary : theme.colors.text.secondary,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleCreateNote}
                  disabled={creatingNote}
                  style={[styles.addNoteButton, { backgroundColor: theme.colors.primary }]}
                >
                  {creatingNote ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.addNoteButtonText}>Add Note</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {bookmarkedEvents.length > 0 ? (
                <View
                  style={[
                    styles.bookmarkPanel,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.bookmarkPanelHeader}>
                    <Star size={17} color={theme.colors.status.warning} fill={theme.colors.status.warning} />
                    <Text style={[styles.bookmarkPanelTitle, { color: theme.colors.text.primary }]}>
                      Bookmarked Timeline Events
                    </Text>
                  </View>

                  {bookmarkedEvents.slice(0, 5).map((event) => (
                    <View key={event._id} style={styles.bookmarkedEventRow}>
                      <Text
                        numberOfLines={1}
                        style={[styles.bookmarkedEventText, { color: theme.colors.text.secondary }]}
                      >
                        {event.title || event.description || event.eventType}
                      </Text>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleToggleBookmarkFromCase(event._id)}
                        style={[styles.unstarButton, { borderColor: theme.colors.border }]}
                      >
                        <Star
                          size={14}
                          color={theme.colors.status.warning}
                          fill={theme.colors.status.warning}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              {notes.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <MessageSquare size={34} color={theme.colors.text.muted} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                    No investigation notes yet
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                    Add notes for suspicious timestamps, confirmed evidence, or report findings.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={notes}
                  renderItem={renderNote}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.notesList}
                />
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.aiTogglePanel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onLayout={(event) => rememberSectionPosition('ai', event)}
            onPress={() => setIsAiOpen((current) => !current)}
            activeOpacity={0.85}
          >
            <View style={styles.custodyHeadingRow}>
              <View style={[styles.custodyIconBox, { backgroundColor: theme.colors.surfaceHighlight }]}>
                <Bot size={20} color={theme.colors.primary} />
              </View>

              <View style={styles.headerText}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  AI Case Summary
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                  {aiAnalysis
                    ? `Generated by ${aiProvider ? `${aiProvider} ` : ''}${aiModel || 'AI'}${aiGeneratedAt ? ` on ${formatDateTime(aiGeneratedAt)}` : ''}.`
                    : 'Generate a forensic summary, suspicious findings, and next steps.'}
                </Text>
              </View>

              {isAiOpen ? (
                <ChevronUp size={20} color={theme.colors.text.secondary} />
              ) : (
                <ChevronDown size={20} color={theme.colors.text.secondary} />
              )}
            </View>
          </TouchableOpacity>

          {isAiOpen ? (
            <View
              style={[
                styles.aiPanel,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {generatingAiSummary && !aiAnalysis ? (
                <View style={styles.aiEmptyBlock}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                    Generating AI summary...
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                    This can take a little while for cases with many files or timeline events.
                  </Text>
                </View>
              ) : !aiAnalysis ? (
                <View style={styles.aiEmptyBlock}>
                  <Bot size={30} color={theme.colors.text.muted} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                    No AI summary yet
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                    Generate a summary after uploading evidence, extracting metadata, or adding notes.
                  </Text>
                  {aiError ? (
                    <Text style={[styles.aiErrorText, { color: theme.colors.status.error }]}>
                      {aiError}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleGenerateAiSummary}
                    disabled={generatingAiSummary}
                    style={[styles.addNoteButton, { backgroundColor: theme.colors.primary }]}
                  >
                    {generatingAiSummary ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Bot size={16} color="#FFFFFF" />
                        <Text style={styles.addNoteButtonText}>Generate AI Summary</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={[styles.aiSectionTitle, { color: theme.colors.text.primary }]}>
                    Case Summary
                  </Text>
                  <Text style={[styles.aiParagraph, { color: theme.colors.text.secondary }]}>
                    {aiAnalysis.caseSummary}
                  </Text>

                  <Text style={[styles.aiSectionTitle, { color: theme.colors.text.primary }]}>
                    Suspicious Findings
                  </Text>
                  {aiAnalysis.suspiciousFindings?.length ? (
                    aiAnalysis.suspiciousFindings.map((finding, index) => (
                      <View
                        key={`${finding.title}-${index}`}
                        style={[styles.aiFindingCard, { borderColor: theme.colors.border }]}
                      >
                        <View style={styles.aiFindingHeader}>
                          <Text style={[styles.aiFindingTitle, { color: theme.colors.text.primary }]}>
                            {finding.title}
                          </Text>
                          <View style={[styles.aiSeverityBadge, { backgroundColor: theme.colors.surfaceHighlight }]}>
                            <Text style={[styles.aiSeverityText, { color: theme.colors.primary }]}>
                              {finding.severity}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.aiParagraph, { color: theme.colors.text.secondary }]}>
                          {finding.reason}
                        </Text>
                        <Text style={[styles.aiMutedText, { color: theme.colors.text.muted }]}>
                          Evidence: {finding.relatedEvidence || 'N/A'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.aiMutedText, { color: theme.colors.text.muted }]}>
                      No suspicious findings identified.
                    </Text>
                  )}

                  <Text style={[styles.aiSectionTitle, { color: theme.colors.text.primary }]}>
                    Timeline Observations
                  </Text>
                  {renderAiList(aiAnalysis.timelineObservations)}

                  <Text style={[styles.aiSectionTitle, { color: theme.colors.text.primary }]}>
                    Metadata Concerns
                  </Text>
                  {renderAiList(aiAnalysis.metadataConcerns)}

                  <Text style={[styles.aiSectionTitle, { color: theme.colors.text.primary }]}>
                    Recommended Next Steps
                  </Text>
                  {renderAiList(aiAnalysis.recommendedNextSteps)}

                  <Text style={[styles.aiSectionTitle, { color: theme.colors.text.primary }]}>
                    Report Draft
                  </Text>
                  <Text style={[styles.aiParagraph, { color: theme.colors.text.secondary }]}>
                    {aiAnalysis.reportDraft}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleGenerateAiSummary}
                    disabled={generatingAiSummary}
                    style={[styles.regenerateAiButton, { borderColor: theme.colors.border }]}
                  >
                    {generatingAiSummary ? (
                      <ActivityIndicator color={theme.colors.primary} />
                    ) : (
                      <>
                        <RefreshCcw size={15} color={theme.colors.text.primary} />
                        <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                          Regenerate Summary
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.custodyTogglePanel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onLayout={(event) => rememberSectionPosition('custody', event)}
            onPress={() => setIsCustodyOpen((current) => !current)}
            activeOpacity={0.85}
          >
            <View style={styles.custodyHeadingRow}>
              <View style={[styles.custodyIconBox, { backgroundColor: theme.colors.surfaceHighlight }]}>
                <History size={20} color={theme.colors.primary} />
              </View>

              <View style={styles.headerText}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  Chain of Custody
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                  {custodyEntries.length} custody event{custodyEntries.length === 1 ? '' : 's'} recorded.
                </Text>
              </View>

              {isCustodyOpen ? (
                <ChevronUp size={20} color={theme.colors.text.secondary} />
              ) : (
                <ChevronDown size={20} color={theme.colors.text.secondary} />
              )}
            </View>
          </TouchableOpacity>

          {isCustodyOpen ? (
            custodyEntries.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <ShieldCheck size={34} color={theme.colors.text.muted} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                  No custody events yet
                </Text>
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                  Upload evidence or run extraction to begin building the custody record.
                </Text>
              </View>
            ) : (
              <FlatList
                data={custodyEntries}
                renderItem={renderCustodyEntry}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                contentContainerStyle={styles.custodyList}
              />
            )
          ) : null}
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
    borderRadius: 14,
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
  caseStatusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  caseStatusText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
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
    borderRadius: 14,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskPanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 26,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  riskScoreRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskScoreText: {
    fontSize: 22,
    fontWeight: '900',
  },
  riskScoreLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  presentationMiniButton: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  riskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  riskFileCard: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  riskFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskFileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  riskFileScore: {
    fontSize: 13,
    fontWeight: '900',
  },
  riskReasonText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  riskMetaText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 7,
  },
  filesHeader: {
    marginBottom: 14,
  },
  filesList: {
    gap: 12,
    marginBottom: 28,
  },
  fileCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fileRemoveButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
  },
  custodyTogglePanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 2,
  },
  notesTogglePanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  aiTogglePanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  aiPanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
  },
  aiEmptyBlock: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 7,
  },
  aiParagraph: {
    fontSize: 13,
    lineHeight: 20,
  },
  aiBulletText: {
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 3,
  },
  aiMutedText: {
    fontSize: 12,
    lineHeight: 18,
  },
  aiErrorText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  aiFindingCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 9,
  },
  aiFindingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 7,
  },
  aiFindingTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  aiSeverityBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  aiSeverityText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  regenerateAiButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  notesSection: {
    gap: 12,
    marginBottom: 28,
  },
  noteComposer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  noteInput: {
    minHeight: 86,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: 'top',
  },
  findingPills: {
    gap: 8,
    paddingVertical: 12,
  },
  findingPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  findingPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addNoteButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  bookmarkPanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  bookmarkPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bookmarkPanelTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  bookmarkedEventText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
  },
  bookmarkedEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  unstarButton: {
    width: 30,
    height: 30,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesList: {
    gap: 12,
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  noteHeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  noteTypeBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  noteTypeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  noteDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  noteDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    fontWeight: '700',
  },
  noteAuthor: {
    fontSize: 11,
    marginTop: 9,
  },
  custodyHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  custodyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custodyList: {
    gap: 12,
  },
  custodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  custodyMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginRight: 12,
  },
  custodyCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
  },
  custodyTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  custodyTitleGroup: {
    flex: 1,
  },
  custodyLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  custodyTime: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '700',
  },
  custodyStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  custodyStatusText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  custodySummary: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  custodyMetaGrid: {
    gap: 5,
    marginTop: 10,
  },
  custodyMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  custodyHash: {
    fontSize: 11,
    fontFamily: 'monospace',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fileDetailModal: {
    width: '100%',
    maxWidth: 860,
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  },
  presentationModal: {
    width: '100%',
    maxWidth: 1040,
    maxHeight: '92%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  presentationTopBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  presentationTitle: {
    fontSize: 26,
    fontWeight: '900',
  },
  presentationHero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 14,
  },
  presentationHeroText: {
    flex: 1,
  },
  presentationKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  presentationHeadline: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  presentationSubcopy: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  presentationRiskBadge: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentationRiskValue: {
    fontSize: 38,
    fontWeight: '900',
  },
  presentationRiskLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  presentationMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  presentationMetricCard: {
    flex: 1,
    minWidth: 170,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 7,
  },
  presentationMetricValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  presentationMetricLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  presentationColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  presentationPanel: {
    flex: 1,
    minWidth: 300,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
  },
  presentationPanelTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
  },
  presentationRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  presentationRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentationRankText: {
    fontSize: 13,
    fontWeight: '900',
  },
  presentationRowTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  presentationRowMeta: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  presentationRowScore: {
    fontSize: 16,
    fontWeight: '900',
  },
  presentationStoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 12,
  },
  presentationBullet: {
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  detailHashBlock: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  detailHashText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 17,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 10,
  },
  previewBox: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 340,
  },
  previewLinkText: {
    fontSize: 14,
    fontWeight: '900',
  },
  textPreview: {
    width: '100%',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  relatedItem: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    marginBottom: 8,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  relatedMeta: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  fileNoteComposer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  fileNoteInput: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
});
