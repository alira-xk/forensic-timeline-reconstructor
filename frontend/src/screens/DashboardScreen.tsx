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
import { Skeleton, ListSkeleton } from '../components/Skeleton';
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
      icon: <Database size={24} color={theme.colors.primary} />,
      accentColor: theme.colors.primary,
      note: 'Stored investigations',
    },
    {
      key: 'ACTIVE_CASES',
      label: 'Active',
      value: activeCases,
      icon: <FolderOpen size={24} color={theme.colors.status.success} />,
      accentColor: theme.colors.status.success,
      note: 'Open investigations',
    },
    {
      key: 'EVIDENCE_FILES',
      label: 'Evidence',
      value: totalEvidenceFiles,
      icon: <FileText size={24} color={theme.colors.primary} />,
      accentColor: theme.colors.primary,
      note: 'Files in custody',
    },
    {
      key: 'PROCESSED_FILES',
      label: 'Processed',
      value: processedFiles,
      icon: <CheckCircle size={24} color={theme.colors.status.success} />,
      accentColor: theme.colors.status.success,
      note: `${completionRate}% extraction rate`,
    },
    {
      key: 'PENDING_FILES',
      label: 'Pending',
      value: pendingFiles,
      icon: <Clock size={24} color={theme.colors.status.warning} />,
      accentColor: theme.colors.status.warning,
      note: 'Awaiting extraction',
    },
    {
      key: 'FAILED_FILES',
      label: 'Failed',
      value: failedFiles,
      icon: <AlertTriangle size={24} color={theme.colors.status.error} />,
      accentColor: theme.colors.status.error,
      note: 'Need review',
    },
    {
      key: 'TIMELINE_EVENTS',
      label: 'Events',
      value: totalTimelineEvents,
      icon: <BarChart3 size={24} color={theme.colors.accent} />,
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
        description: `${event.fileRecord?.originalName || 'Unknown file'} - ${event.description || event.eventSource || 'Timeline event recorded'}`,
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
        meta: `${item.status.replace('_', ' ')} - Created ${formatDate(item.createdAt)}`,
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
          meta: `${item.status.replace('_', ' ')} - Created ${formatDate(item.createdAt)}`,
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
        activeOpacity={0.8}
        onPress={() => setSelectedMetric(item.key)}
        style={[
          styles.metricCard,
          {
            borderColor: selected ? item.accentColor : theme.colors.border,
            backgroundColor: selected ? `${item.accentColor}11` : theme.colors.panel,
            borderWidth: selected ? 2 : 1,
            transform: [{ scale: selected ? 1.02 : 1 }],
          },
        ]}
      >
        <View style={styles.metricTopRow}>
          <View style={[styles.metricIcon, { backgroundColor: `${item.accentColor}22` }]}>
            {item.icon}
          </View>
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
        {/* Modern Header Section */}
        <View style={styles.headerModern}>
            <View>
              <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
                Welcome back, {displayName}
              </Text>
              <Text style={[styles.greeting, { color: theme.colors.text.secondary }]}>
                Here&apos;s what&apos;s happening with your investigations.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={[styles.settingsButton, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}
            >
              <Settings size={18} color={theme.colors.text.secondary} />
              {isWeb ? <Text style={[styles.settingsLabel, { color: theme.colors.text.primary }]}>Settings</Text> : null}
            </TouchableOpacity>
        </View>

        {loading && cases.length === 0 ? (
          <View style={styles.dashboardSkeleton}>
            <View style={styles.skeletonActions}>
              <Skeleton height={74} style={styles.skeletonAction} />
              <Skeleton height={74} style={styles.skeletonAction} />
              <Skeleton height={74} style={styles.skeletonAction} />
            </View>
            <View style={styles.skeletonMetrics}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} width={150} height={148} />
              ))}
            </View>
            <ListSkeleton rows={4} />
          </View>
        ) : (
          <>
            <View style={styles.quickActionsCard}>
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.primaryAction, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('CreateCase')}
                  >
                    <View style={[styles.actionIconBadge, styles.primaryActionIcon]}>
                      <Plus size={20} color="#fff" />
                    </View>
                    <View style={styles.actionCopy}>
                      <Text style={[styles.actionLabel, { color: '#ffffff' }]}>New Case</Text>
                      <Text style={styles.primaryActionSubtext}>Start a new investigation</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}
                    onPress={() => navigation.navigate('CasesList')}
                  >
                    <View style={[styles.actionIconBadge, { backgroundColor: `${theme.colors.primary}0d` }]}>
                      <FolderOpen size={20} color={theme.colors.text.secondary} />
                    </View>
                    <View style={styles.actionCopy}>
                      <Text style={[styles.actionLabel, { color: theme.colors.text.primary }]}>All Cases</Text>
                      <Text style={[styles.actionSubtext, { color: theme.colors.text.secondary }]}>View and manage cases</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}
                    onPress={handleViewLatestTimeline}
                  >
                    <View style={[styles.actionIconBadge, { backgroundColor: `${theme.colors.primary}0d` }]}>
                      <BarChart3 size={20} color={theme.colors.text.secondary} />
                    </View>
                    <View style={styles.actionCopy}>
                      <Text style={[styles.actionLabel, { color: theme.colors.text.primary }]}>Latest Timeline</Text>
                      <Text style={[styles.actionSubtext, { color: theme.colors.text.secondary }]}>Open recent timeline</Text>
                    </View>
                  </TouchableOpacity>
                </View>
            </View>

            {/* Metrics Scroll - Modern Horizontal List */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Investigation overview
              </Text>
              <TouchableOpacity onPress={loadDashboardData} style={styles.refreshBtn}>
                <RefreshCcw size={16} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontWeight: '600', marginLeft: 6 }}>Sync</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.metricsScrollContent}
            >
              {metricItems.map(renderMetricCard)}
            </ScrollView>

            {/* Layout Split for Desktop vs Mobile */}
            <View style={[styles.splitLayout, isWeb && { flexDirection: 'row' }]}>
              {/* Left Column - Details */}
              <View style={[styles.column, isWeb && { flex: 2, paddingRight: 24 }]}>
                <Card glass style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
                      {selectedMetricTitle}
                    </Text>
                  </View>
                  <View style={styles.detailsList}>
                    {selectedDetails.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Activity size={40} color={theme.colors.text.muted} style={{ marginBottom: 12, opacity: 0.5 }} />
                        <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
                          No items found for {selectedMetricTitle.toLowerCase()}.
                        </Text>
                      </View>
                    ) : (
                      selectedDetails.map((item, index) => (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={canOpenCaseFromSelectedList ? 0.7 : 1}
                          onPress={() => handleDetailItemPress(item)}
                          disabled={!canOpenCaseFromSelectedList}
                          style={[
                            styles.detailItemRow,
                            { borderBottomColor: index === selectedDetails.length - 1 ? 'transparent' : theme.colors.border },
                          ]}
                        >
                          <View style={styles.detailItemContent}>
                            <Text style={[styles.detailItemTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={[styles.detailItemSubtitle, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                            <Text style={[styles.detailItemMeta, { color: theme.colors.text.muted }]}>
                              {item.meta}
                            </Text>
                          </View>
                          {canOpenCaseFromSelectedList && (
                            <View style={styles.detailItemArrow}>
                              <ArrowRight size={18} color={theme.colors.text.muted} />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </Card>
              </View>

              {/* Right Column - Recent Activity */}
              <View style={[styles.column, isWeb && { flex: 1 }]}>
                <Card glass style={styles.activityCard}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
                      Recent Activity
                    </Text>
                  </View>

                  <View style={styles.activityList}>
                    {recentActivity.length === 0 ? (
                      <View style={styles.emptyStateActivity}>
                        <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
                          No recent events detected.
                        </Text>
                      </View>
                    ) : (
                      recentActivity.map((activity, index) => (
                        <View key={activity.id} style={styles.activityItem}>
                          <View style={styles.activityTimeline}>
                            <View
                              style={[
                                styles.activityDot,
                                { backgroundColor: getActivityColor(activity.type) },
                              ]}
                            />
                            {index < recentActivity.length - 1 && (
                              <View style={[styles.activityLine, { backgroundColor: theme.colors.border }]} />
                            )}
                          </View>

                          <View style={styles.activityContent}>
                            <Text style={[styles.activityTitle, { color: theme.colors.text.primary }]}>
                              {activity.title}
                            </Text>
                            <Text style={[styles.activityDescription, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                              {activity.description}
                            </Text>
                            <Text style={[styles.activityTime, { color: theme.colors.text.muted }]}>
                              {activity.time}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </Card>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 1260,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 48,
  },
  headerModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  userName: {
    fontSize: 27,
    fontWeight: '800',
  },
  settingsButton: {
    minWidth: 44,
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardSkeleton: {
    gap: 20,
  },
  skeletonActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skeletonAction: {
    flex: 1,
    minWidth: 180,
  },
  skeletonMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionsCard: {
    marginBottom: 26,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  actionBtn: {
    flex: 1,
    minWidth: 190,
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 17,
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
  },
  primaryAction: {
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  actionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionIcon: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  primaryActionSubtext: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  metricsScrollContent: {
    paddingBottom: 14,
    gap: 10,
  },
  metricCard: {
    width: 140,
    minHeight: 134,
    padding: 14,
    borderRadius: 8,
    marginRight: 4,
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  metricNote: {
    fontSize: 11,
    fontWeight: '600',
  },
  splitLayout: {
    marginTop: 14,
    gap: 16,
  },
  column: {
    flexDirection: 'column',
  },
  detailsCard: {
    flex: 1,
    minHeight: 390,
  },
  activityCard: {
    flex: 1,
    minHeight: 390,
  },
  cardHeader: {
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  detailsList: {
    flex: 1,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  detailItemContent: {
    flex: 1,
    paddingRight: 16,
  },
  detailItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailItemSubtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailItemMeta: {
    fontSize: 12,
  },
  detailItemArrow: {
    opacity: 0.5,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateActivity: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  activityList: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  activityTimeline: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    zIndex: 1,
  },
  activityLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
    paddingBottom: 24,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '600',
  },
});
