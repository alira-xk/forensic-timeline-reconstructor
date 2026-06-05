import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  FileText,
  FolderOpen,
  Plus,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Upload,
  Zap,
} from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SettingsPopup } from '../components/SettingsPopup';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { getCases, CaseItem } from '../services/caseService';
import { getFilesByCase, EvidenceFile } from '../services/fileService';
import { getTimelineByCase, TimelineEvent } from '../services/timelineService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

type RecentActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: string;
};

type SelectedMetric =
  | 'TOTAL_CASES'
  | 'ACTIVE_CASES'
  | 'EVIDENCE_FILES'
  | 'PROCESSED_FILES'
  | 'PENDING_FILES'
  | 'FAILED_FILES'
  | 'TIMELINE_EVENTS';

type DetailItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  caseId?: string;
};

type MetricItem = {
  key: SelectedMetric;
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  note: string;
};

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === 'web' && width > 900;

  const [showSettings, setShowSettings] = useState(false);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>('TOTAL_CASES');

  const loggedInUser = user as any;
  const displayName =
    loggedInUser?.name ||
    loggedInUser?.fullName ||
    loggedInUser?.username ||
    loggedInUser?.email?.split('@')[0] ||
    'Investigator';

  const displayEmail = loggedInUser?.email || 'Logged in user';

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const casesData = await getCases();
      const fileResults = await Promise.all(casesData.map((caseItem) => getFilesByCase(caseItem._id)));
      const timelineResults = await Promise.all(casesData.map((caseItem) => getTimelineByCase(caseItem._id)));

      setCases(casesData);
      setFiles(fileResults.flat());
      setTimelineEvents(timelineResults.flat());
    } catch (error: any) {
      Alert.alert('Dashboard Error', error.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const totalCases = cases.length;
  const activeCases = cases.filter((item) => item.status === 'open').length;
  const totalEvidenceFiles = files.length;
  const pendingFiles = files.filter((file) => file.status === 'pending').length;
  const processedFiles = files.filter((file) => file.status === 'processed').length;
  const failedFiles = files.filter((file) => file.status === 'failed').length;
  const totalTimelineEvents = timelineEvents.length;
  const latestCase = cases[0];
  const completionRate = totalEvidenceFiles > 0 ? Math.round((processedFiles / totalEvidenceFiles) * 100) : 0;

  const metricItems = useMemo<MetricItem[]>(() => [
    {
      key: 'TOTAL_CASES',
      label: 'Cases',
      value: totalCases,
      icon: <Database size={19} color={theme.colors.primary} />,
      accentColor: theme.colors.primary,
      note: 'Stored investigations',
    },
    {
      key: 'ACTIVE_CASES',
      label: 'Active',
      value: activeCases,
      icon: <FolderOpen size={19} color={theme.colors.status.success} />,
      accentColor: theme.colors.status.success,
      note: 'Open investigations',
    },
    {
      key: 'EVIDENCE_FILES',
      label: 'Evidence',
      value: totalEvidenceFiles,
      icon: <FileText size={19} color={theme.colors.primary} />,
      accentColor: theme.colors.primary,
      note: 'Files in custody',
    },
    {
      key: 'PROCESSED_FILES',
      label: 'Processed',
      value: processedFiles,
      icon: <CheckCircle size={19} color={theme.colors.status.success} />,
      accentColor: theme.colors.status.success,
      note: `${completionRate}% extraction rate`,
    },
    {
      key: 'PENDING_FILES',
      label: 'Pending',
      value: pendingFiles,
      icon: <Clock size={19} color={theme.colors.status.warning} />,
      accentColor: theme.colors.status.warning,
      note: 'Awaiting extraction',
    },
    {
      key: 'FAILED_FILES',
      label: 'Failed',
      value: failedFiles,
      icon: <AlertTriangle size={19} color={theme.colors.status.error} />,
      accentColor: theme.colors.status.error,
      note: 'Need review',
    },
    {
      key: 'TIMELINE_EVENTS',
      label: 'Events',
      value: totalTimelineEvents,
      icon: <BarChart3 size={19} color={theme.colors.accent} />,
      accentColor: theme.colors.accent,
      note: 'Extracted signals',
    },
  ], [
    activeCases,
    completionRate,
    failedFiles,
    pendingFiles,
    processedFiles,
    theme.colors,
    totalCases,
    totalEvidenceFiles,
    totalTimelineEvents,
  ]);

  const recentActivity = useMemo<RecentActivityItem[]>(() => {
    return timelineEvents
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp).getTime();
        const dateB = new Date(b.createdAt || b.timestamp).getTime();
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((event) => ({
        id: event._id,
        title: event.eventType,
        description: `${event.fileRecord?.originalName || 'Unknown file'} - ${
          event.description || event.eventSource || 'Timeline event recorded'
        }`,
        time: formatTime(event.createdAt || event.timestamp),
        type: event.eventType,
      }));
  }, [timelineEvents]);

  const selectedMetricTitle = useMemo(() => {
    const metric = metricItems.find((item) => item.key === selectedMetric);
    return metric?.label || 'Details';
  }, [metricItems, selectedMetric]);

  const selectedDetails = useMemo<DetailItem[]>(() => {
    if (selectedMetric === 'TOTAL_CASES') {
      return cases.map((item) => ({
        id: item._id,
        title: item.title,
        subtitle: item.description || 'No description provided.',
        meta: `${item.status} - Created ${formatDate(item.createdAt)}`,
        caseId: item._id,
      }));
    }

    if (selectedMetric === 'ACTIVE_CASES') {
      return cases
        .filter((item) => item.status === 'open')
        .map((item) => ({
          id: item._id,
          title: item.title,
          subtitle: item.description || 'No description provided.',
          meta: `${item.status} - Created ${formatDate(item.createdAt)}`,
          caseId: item._id,
        }));
    }

    if (selectedMetric === 'EVIDENCE_FILES') {
      return files.map((item) => ({
        id: item._id,
        title: item.originalName,
        subtitle: `Type ${item.fileType} - ${item.status}`,
        meta: `SHA-256 ${shortHash(item.sha256Hash)} - Uploaded ${formatDate(item.createdAt)}`,
      }));
    }

    if (selectedMetric === 'PROCESSED_FILES') {
      return files
        .filter((item) => item.status === 'processed')
        .map((item) => ({
          id: item._id,
          title: item.originalName,
          subtitle: `Type ${item.fileType} - ${item.status}`,
          meta: `SHA-256 ${shortHash(item.sha256Hash)} - Uploaded ${formatDate(item.createdAt)}`,
        }));
    }

    if (selectedMetric === 'PENDING_FILES') {
      return files
        .filter((item) => item.status === 'pending')
        .map((item) => ({
          id: item._id,
          title: item.originalName,
          subtitle: `Type ${item.fileType} - ${item.status}`,
          meta: `SHA-256 ${shortHash(item.sha256Hash)} - Uploaded ${formatDate(item.createdAt)}`,
        }));
    }

    if (selectedMetric === 'FAILED_FILES') {
      return files
        .filter((item) => item.status === 'failed')
        .map((item) => ({
          id: item._id,
          title: item.originalName,
          subtitle: item.errorReason || `Type ${item.fileType} - ${item.status}`,
          meta: `SHA-256 ${shortHash(item.sha256Hash)} - Uploaded ${formatDate(item.createdAt)}`,
        }));
    }

    return timelineEvents
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((item) => ({
        id: item._id,
        title: item.eventType,
        subtitle: item.description || item.eventSource || 'Timeline event recorded.',
        meta: `File ${item.fileRecord?.originalName || 'N/A'} - ${formatDateTime(item.timestamp)}`,
      }));
  }, [selectedMetric, cases, files, timelineEvents]);

  function formatTime(dateValue?: string) {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(dateValue?: string) {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleDateString();
  }

  function formatDateTime(dateValue?: string) {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleString();
  }

  function shortHash(hash?: string) {
    if (!hash) return 'N/A';
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  }

  const getActivityColor = (type: string) => {
    const normalized = type.toUpperCase();
    if (normalized.includes('FAILED')) return theme.colors.status.error;
    if (normalized.includes('UPLOADED')) return theme.colors.status.success;
    if (normalized.includes('IMAGE')) return theme.colors.primary;
    if (normalized.includes('AUTHOR')) return theme.colors.accent;
    return theme.colors.amber;
  };

  const handleViewLatestTimeline = () => {
    if (!latestCase) {
      Alert.alert('No Case Found', 'Create a case first, then open its timeline.');
      return;
    }

    navigation.navigate('Timeline', { caseId: latestCase._id });
  };

  const canOpenCaseFromSelectedList = selectedMetric === 'TOTAL_CASES' || selectedMetric === 'ACTIVE_CASES';

  const handleDetailItemPress = (item: DetailItem) => {
    if (!canOpenCaseFromSelectedList || !item.caseId) return;
    navigation.navigate('CaseDetail', { caseId: item.caseId });
  };

  const renderMetricCard = (item: MetricItem) => {
    const selected = selectedMetric === item.key;

    return (
      <TouchableOpacity
        key={item.key}
        activeOpacity={0.86}
        onPress={() => setSelectedMetric(item.key)}
        style={[
          styles.metricCard,
          {
            borderColor: selected ? item.accentColor : theme.colors.border,
            backgroundColor: theme.colors.panel,
          },
        ]}
      >
        <View style={styles.metricTopRow}>
          <View style={[styles.metricIcon, { backgroundColor: `${item.accentColor}18` }]}>
            {item.icon}
          </View>
          <View style={[styles.metricPulse, { backgroundColor: item.accentColor }]} />
        </View>

        <Text style={[styles.metricValue, { color: theme.colors.text.primary }]}>{item.value}</Text>
        <Text style={[styles.metricLabel, { color: theme.colors.text.secondary }]}>{item.label}</Text>
        <Text numberOfLines={1} style={[styles.metricNote, { color: item.accentColor }]}>{item.note}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper fullWidth withSidebar={true}>
      <SettingsPopup
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        anchorPosition={{ top: 80, right: 24 }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={theme.dark ? ['#111C2C', '#0C121A'] : ['#FFFFFF', '#ECF4FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: theme.colors.border }]}
        >
          <View style={styles.heroCopy}>
            <View style={[styles.kickerPill, { borderColor: theme.colors.border }]}>
              <ShieldCheck size={14} color={theme.colors.accent} />
              <Text style={[styles.kickerText, { color: theme.colors.text.secondary }]}>
                Evidence Reconstruction Workspace
              </Text>
            </View>

            <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>
              Welcome Back to Your Dashboard, {displayName}
            </Text>


            <View style={styles.heroActions}>
              <Button
                title="Create Case"
                onPress={() => navigation.navigate('CreateCase')}
                icon={<Plus size={18} color="#FFFFFF" />}
                style={styles.heroButton}
              />

              <Button
                title="Latest Timeline"
                variant="secondary"
                onPress={handleViewLatestTimeline}
                icon={<Activity size={18} color={theme.colors.text.primary} />}
                style={styles.heroButton}
              />
            </View>
          </View>

          <View style={styles.orbitPanel}>
            <View style={[styles.orbitRing, { borderColor: theme.colors.backdrop.grid }]}>
              <View style={[styles.orbitCore, { backgroundColor: theme.colors.primary }]}>
                <Zap size={30} color="#FFFFFF" />
              </View>
              <View style={[styles.orbitNode, styles.orbitNodeA, { backgroundColor: theme.colors.accent }]} />
              <View style={[styles.orbitNode, styles.orbitNodeB, { backgroundColor: theme.colors.amber }]} />
              <View style={[styles.orbitNode, styles.orbitNodeC, { backgroundColor: theme.colors.status.error }]} />
            </View>

            <View style={[styles.heroStatPlate, { backgroundColor: theme.colors.panel, borderColor: theme.colors.border }]}>
              <Text style={[styles.heroStatLabel, { color: theme.colors.text.secondary }]}>Processed evidence</Text>
              <Text style={[styles.heroStatValue, { color: theme.colors.text.primary }]}>{completionRate}%</Text>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>Loading dashboard data...</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricsScroller}>
              <ScrollView
                horizontal={!isWeb}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.metricsGrid, isWeb && styles.metricsGridWeb]}
              >
                {metricItems.map(renderMetricCard)}
              </ScrollView>
            </View>

            <View style={[styles.mainGrid, isWeb && styles.mainGridWeb]}>
              <Card style={styles.detailPanel}>
                <View style={styles.panelHeader}>
                  <View>
                    <Text style={[styles.sectionEyebrow, { color: theme.colors.primary }]}>Live index</Text>
                    <Text style={[styles.panelTitle, { color: theme.colors.text.primary }]}>
                      {selectedMetricTitle}
                    </Text>
                  </View>

                  <Text style={[styles.panelCount, { color: theme.colors.text.secondary }]}>
                    {selectedDetails.length} records
                  </Text>
                </View>

                {selectedDetails.length === 0 ? (
                  <View style={styles.emptyDetail}>
                    <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No records found</Text>
                    <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>This category has no data yet.</Text>
                  </View>
                ) : (
                  selectedDetails.slice(0, 8).map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={canOpenCaseFromSelectedList ? 0.78 : 1}
                      disabled={!canOpenCaseFromSelectedList}
                      onPress={() => handleDetailItemPress(item)}
                      style={[styles.detailRow, index !== 0 && { borderTopColor: theme.colors.border, borderTopWidth: 1 }]}
                    >
                      <View style={[styles.detailDot, { backgroundColor: theme.colors.primary }]} />
                      <View style={styles.detailContent}>
                        <Text numberOfLines={1} style={[styles.detailTitle, { color: theme.colors.text.primary }]}>
                          {item.title}
                        </Text>
                        <Text numberOfLines={2} style={[styles.detailSubtitle, { color: theme.colors.text.secondary }]}>
                          {item.subtitle}
                        </Text>
                        <Text numberOfLines={1} style={[styles.detailMeta, { color: theme.colors.text.muted }]}>
                          {item.meta}
                        </Text>
                      </View>
                      {canOpenCaseFromSelectedList ? <ArrowRight size={17} color={theme.colors.text.muted} /> : null}
                    </TouchableOpacity>
                  ))
                )}
              </Card>

              <View style={styles.sideStack}>
                <Card style={styles.actionPanel}>
                  <Text style={[styles.sectionEyebrow, { color: theme.colors.accent }]}>Fast path</Text>
                  <Text style={[styles.panelTitle, { color: theme.colors.text.primary }]}>Investigation actions</Text>

                  <View style={styles.actionGrid}>
                    <Button
                      title="Cases"
                      onPress={() => navigation.navigate('CasesList')}
                      variant="secondary"
                      icon={<FolderOpen size={18} color={theme.colors.text.primary} />}
                    />
                    <Button
                      title="Timeline"
                      onPress={handleViewLatestTimeline}
                      variant="secondary"
                      icon={<Activity size={18} color={theme.colors.text.primary} />}
                    />
                  </View>

                  <View style={[styles.summaryStrip, { borderColor: theme.colors.border }]}>
                    <Upload size={16} color={theme.colors.primary} />
                    <Text style={[styles.summaryStripText, { color: theme.colors.text.secondary }]}>
                      PDF, DOC, DOCX, images, TXT, and LOG files can be added to a case.
                    </Text>
                  </View>
                </Card>

                <Card style={styles.activityPanel}>
                  <View style={styles.panelHeader}>
                    <View>
                      <Text style={[styles.sectionEyebrow, { color: theme.colors.amber }]}>Recent signals</Text>
                      <Text style={[styles.panelTitle, { color: theme.colors.text.primary }]}>Timeline activity</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.iconButton, { borderColor: theme.colors.border }]}
                      onPress={loadDashboardData}
                      activeOpacity={0.8}
                    >
                      <RefreshCcw size={15} color={theme.colors.text.secondary} />
                    </TouchableOpacity>
                  </View>

                  {recentActivity.length === 0 ? (
                    <View style={styles.emptyActivity}>
                      <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No activity yet</Text>
                      <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                        Upload evidence and run metadata extraction to generate timeline activity.
                      </Text>
                    </View>
                  ) : (
                    recentActivity.map((item, index) => (
                      <View
                        key={item.id}
                        style={[
                          styles.activityItem,
                          index !== 0 && { borderTopColor: theme.colors.border, borderTopWidth: 1 },
                        ]}
                      >
                        <View style={[styles.activityDot, { backgroundColor: getActivityColor(item.type) }]} />
                        <View style={styles.activityContent}>
                          <Text numberOfLines={1} style={[styles.activityTitle, { color: theme.colors.text.primary }]}>
                            {item.title}
                          </Text>
                          <Text numberOfLines={2} style={[styles.activityDesc, { color: theme.colors.text.secondary }]}>
                            {item.description}
                          </Text>
                        </View>
                        <Text style={[styles.activityTime, { color: theme.colors.text.muted }]}>{item.time}</Text>
                      </View>
                    ))
                  )}
                </Card>
              </View>
            </View>
          </>
        )}

        {!isWeb ? (
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={[styles.mobileSettings, { backgroundColor: theme.colors.panelStrong, borderColor: theme.colors.border }]}
            activeOpacity={0.85}
          >
            <Settings size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 52,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 24,
    minHeight: 330,
    padding: 28,
    marginBottom: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    gap: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 24px 80px rgba(15, 23, 42, 0.16)',
      } as any,
    }),
  },
  heroCopy: {
    flex: 1,
    minWidth: 260,
  },
  kickerPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  kickerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    maxWidth: 640,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 690,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  heroButton: {
    minWidth: 150,
  },
  identityText: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '700',
  },
  orbitPanel: {
    width: 260,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRing: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitCore: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitNode: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 14,
  },
  orbitNodeA: {
    top: 14,
    right: 44,
  },
  orbitNodeB: {
    bottom: 26,
    left: 34,
  },
  orbitNodeC: {
    right: 18,
    bottom: 70,
  },
  heroStatPlate: {
    position: 'absolute',
    right: 0,
    bottom: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    width: 168,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroStatValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  loadingBox: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  metricsScroller: {
    marginBottom: 20,
  },
  metricsGrid: {
    gap: 12,
    paddingRight: 24,
  },
  metricsGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingRight: 0,
  },
  metricCard: {
    width: 172,
    minHeight: 154,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 14,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  metricNote: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
  },
  mainGrid: {
    gap: 18,
  },
  mainGridWeb: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailPanel: {
    flex: 1.25,
    padding: 0,
    overflow: 'hidden',
  },
  sideStack: {
    flex: 0.8,
    gap: 18,
  },
  panelHeader: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  panelTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  panelCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailRow: {
    minHeight: 86,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailContent: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  detailSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  detailMeta: {
    fontSize: 11,
    marginTop: 5,
  },
  emptyDetail: {
    padding: 22,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  actionPanel: {
    padding: 18,
  },
  actionGrid: {
    gap: 10,
    marginTop: 16,
  },
  summaryStrip: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryStripText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  activityPanel: {
    padding: 0,
    overflow: 'hidden',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivity: {
    padding: 18,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 13,
  },
  activityDot: {
    width: 9,
    height: 34,
    borderRadius: 9,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontWeight: '900',
    fontSize: 14,
  },
  activityDesc: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  activityTime: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  mobileSettings: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
