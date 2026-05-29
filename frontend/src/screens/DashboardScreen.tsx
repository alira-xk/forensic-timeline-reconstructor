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
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  FileText,
  FolderOpen,
  Plus,
  RefreshCcw,
  Settings,
  Upload,
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
};

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === 'web' && width > 768;

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

      const fileResults = await Promise.all(
        casesData.map((caseItem) => getFilesByCase(caseItem._id))
      );

      const timelineResults = await Promise.all(
        casesData.map((caseItem) => getTimelineByCase(caseItem._id))
      );

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
        description: `${event.fileRecord?.originalName || 'Unknown file'} • ${
          event.description || event.eventSource || 'Timeline event recorded'
        }`,
        time: formatTime(event.createdAt || event.timestamp),
        type: event.eventType,
      }));
  }, [timelineEvents]);

  const selectedMetricTitle = useMemo(() => {
    switch (selectedMetric) {
      case 'TOTAL_CASES':
        return 'Total Cases';
      case 'ACTIVE_CASES':
        return 'Active Cases';
      case 'EVIDENCE_FILES':
        return 'Evidence Files';
      case 'PROCESSED_FILES':
        return 'Processed Files';
      case 'PENDING_FILES':
        return 'Pending Files';
      case 'FAILED_FILES':
        return 'Failed Files';
      case 'TIMELINE_EVENTS':
        return 'Timeline Events';
      default:
        return 'Details';
    }
  }, [selectedMetric]);

  const selectedDetails = useMemo<DetailItem[]>(() => {
    if (selectedMetric === 'TOTAL_CASES') {
      return cases.map((item) => ({
        id: item._id,
        title: item.title,
        subtitle: item.description || 'No description provided.',
        meta: `Status: ${item.status} • Created: ${formatDate(item.createdAt)}`,
      }));
    }

    if (selectedMetric === 'ACTIVE_CASES') {
      return cases
        .filter((item) => item.status === 'open')
        .map((item) => ({
          id: item._id,
          title: item.title,
          subtitle: item.description || 'No description provided.',
          meta: `Status: ${item.status} • Created: ${formatDate(item.createdAt)}`,
        }));
    }

    if (selectedMetric === 'EVIDENCE_FILES') {
      return files.map((item) => ({
        id: item._id,
        title: item.originalName,
        subtitle: `Type: ${item.fileType} • Status: ${item.status}`,
        meta: `SHA-256: ${shortHash(item.sha256Hash)} • Uploaded: ${formatDate(item.createdAt)}`,
      }));
    }

    if (selectedMetric === 'PROCESSED_FILES') {
      return files
        .filter((item) => item.status === 'processed')
        .map((item) => ({
          id: item._id,
          title: item.originalName,
          subtitle: `Type: ${item.fileType} • Status: ${item.status}`,
          meta: `SHA-256: ${shortHash(item.sha256Hash)} • Uploaded: ${formatDate(item.createdAt)}`,
        }));
    }

    if (selectedMetric === 'PENDING_FILES') {
      return files
        .filter((item) => item.status === 'pending')
        .map((item) => ({
          id: item._id,
          title: item.originalName,
          subtitle: `Type: ${item.fileType} • Status: ${item.status}`,
          meta: `SHA-256: ${shortHash(item.sha256Hash)} • Uploaded: ${formatDate(item.createdAt)}`,
        }));
    }

    if (selectedMetric === 'FAILED_FILES') {
      return files
        .filter((item) => item.status === 'failed')
        .map((item) => ({
          id: item._id,
          title: item.originalName,
          subtitle: item.errorReason || `Type: ${item.fileType} • Status: ${item.status}`,
          meta: `SHA-256: ${shortHash(item.sha256Hash)} • Uploaded: ${formatDate(item.createdAt)}`,
        }));
    }

    return timelineEvents
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((item) => ({
        id: item._id,
        title: item.eventType,
        subtitle: item.description || item.eventSource || 'Timeline event recorded.',
        meta: `File: ${item.fileRecord?.originalName || 'N/A'} • Time: ${formatDateTime(item.timestamp)}`,
      }));
  }, [selectedMetric, cases, files, timelineEvents]);

  function formatTime(dateValue?: string) {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(dateValue?: string) {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleDateString();
  }

  function formatDateTime(dateValue?: string) {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleString();
  }

  function shortHash(hash?: string) {
    if (!hash) {
      return 'N/A';
    }

    if (hash.length <= 16) {
      return hash;
    }

    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  }

  const getActivityColor = (type: string) => {
    const normalized = type.toUpperCase();

    if (normalized.includes('FAILED')) {
      return theme.colors.status.error;
    }

    if (normalized.includes('UPLOADED')) {
      return theme.colors.status.success;
    }

    if (normalized.includes('LOG')) {
      return theme.colors.status.info;
    }

    if (normalized.includes('IMAGE')) {
      return theme.colors.primary;
    }

    return theme.colors.status.warning;
  };

  const handleViewLatestTimeline = () => {
    if (!latestCase) {
      Alert.alert('No Case Found', 'Create a case first, then open its timeline.');
      return;
    }

    navigation.navigate('Timeline', { caseId: latestCase._id });
  };

  const renderStatCard = (
    key: SelectedMetric,
    label: string,
    value: number,
    icon: React.ReactNode,
    accentColor: string
  ) => {
    const isSelected = selectedMetric === key;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSelectedMetric(key)}
        style={styles.statTouchable}
      >
        <Card
          style={[
            styles.statCard,
            {
              borderColor: isSelected ? accentColor : theme.colors.border,
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
        >
          <View style={[styles.statIconDef, { backgroundColor: `${accentColor}18` }]}>
            {icon}
          </View>

          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
            {value}
          </Text>

          <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
            {label}
          </Text>

          {isSelected ? (
            <Text style={[styles.selectedText, { color: accentColor }]}>
              Selected
            </Text>
          ) : null}
        </Card>
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

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { borderColor: theme.colors.border }]}>
          <View>
            <Text style={[styles.brandTitle, { color: theme.colors.text.secondary }]}>
              Case management
            </Text>

            <Text style={[styles.welcome, { color: theme.colors.text.primary }]}>
              Welcome back, {displayName}
            </Text>

            <Text style={[styles.emailText, { color: theme.colors.text.secondary }]}>
              {displayEmail}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {!isWeb && (
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                style={[styles.settingsIcon, { backgroundColor: theme.colors.surfaceHighlight }]}
              >
                <Settings size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={loadDashboardData}
              style={[
                styles.badge,
                {
                  backgroundColor: theme.colors.surfaceHighlight,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <RefreshCcw size={14} color={theme.colors.primary} />
              <Text style={[styles.badgeText, { color: theme.colors.text.primary }]}>
                REFRESH
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
              Loading dashboard data...
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.statsRow, isWeb && styles.statsRowWeb]}>
              {renderStatCard(
                'TOTAL_CASES',
                'Total Cases',
                totalCases,
                <Database color={theme.colors.primary} size={20} />,
                theme.colors.primary
              )}

              {renderStatCard(
                'ACTIVE_CASES',
                'Active Cases',
                activeCases,
                <FolderOpen color={theme.colors.status.success} size={20} />,
                theme.colors.status.success
              )}

              {renderStatCard(
                'EVIDENCE_FILES',
                'Evidence Files',
                totalEvidenceFiles,
                <FileText color={theme.colors.primary} size={20} />,
                theme.colors.primary
              )}
            </View>

            <View style={[styles.statsRow, isWeb && styles.statsRowWeb]}>
              {renderStatCard(
                'PROCESSED_FILES',
                'Processed Files',
                processedFiles,
                <CheckCircle color={theme.colors.status.success} size={20} />,
                theme.colors.status.success
              )}

              {renderStatCard(
                'PENDING_FILES',
                'Pending Files',
                pendingFiles,
                <Clock color={theme.colors.status.warning} size={20} />,
                theme.colors.status.warning
              )}

              {renderStatCard(
                'FAILED_FILES',
                'Failed Files',
                failedFiles,
                <AlertTriangle color={theme.colors.status.error} size={20} />,
                theme.colors.status.error
              )}

              {renderStatCard(
                'TIMELINE_EVENTS',
                'Timeline Events',
                totalTimelineEvents,
                <BarChart3 color={theme.colors.primary} size={20} />,
                theme.colors.primary
              )}
            </View>

            <Card style={styles.detailPanel}>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={[styles.detailTitle, { color: theme.colors.text.primary }]}>
                    {selectedMetricTitle}
                  </Text>
                  <Text style={[styles.detailSubtitle, { color: theme.colors.text.secondary }]}>
                    Showing {selectedDetails.length} record(s)
                  </Text>
                </View>

                <Text style={[styles.clickHint, { color: theme.colors.text.secondary }]}>
                  Click any summary card to change this list
                </Text>
              </View>

              {selectedDetails.length === 0 ? (
                <View style={styles.emptyDetail}>
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                    No records found
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                    This category has no data yet.
                  </Text>
                </View>
              ) : (
                selectedDetails.map((item, index) => (
                  <View key={item.id}>
                    <View style={styles.detailItem}>
                      <View style={[styles.detailDot, { backgroundColor: theme.colors.primary }]} />

                      <View style={styles.detailContent}>
                        <Text
                          numberOfLines={1}
                          style={[styles.detailItemTitle, { color: theme.colors.text.primary }]}
                        >
                          {item.title}
                        </Text>

                        <Text
                          numberOfLines={2}
                          style={[styles.detailItemSubtitle, { color: theme.colors.text.secondary }]}
                        >
                          {item.subtitle}
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={[styles.detailItemMeta, { color: theme.colors.text.muted }]}
                        >
                          {item.meta}
                        </Text>
                      </View>
                    </View>

                    {index !== selectedDetails.length - 1 ? (
                      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                    ) : null}
                  </View>
                ))
              )}
            </Card>

            <View style={[isWeb && styles.webSplitContainer]}>
              <View style={[isWeb && styles.webColLeft]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
                    QUICK ACTIONS
                  </Text>
                </View>

                <View style={styles.actionsGrid}>
                  <Button
                    title="Create New Case"
                    onPress={() => navigation.navigate('CreateCase')}
                    variant="primary"
                    style={styles.actionButton}
                    icon={<Plus size={18} color="#FFFFFF" />}
                  />

                  <Button
                    title="View Cases"
                    onPress={() => navigation.navigate('CasesList')}
                    variant="secondary"
                    style={styles.actionButton}
                    icon={<FolderOpen size={18} color={theme.colors.text.primary} />}
                  />

                  <Button
                    title="View Latest Timeline"
                    onPress={handleViewLatestTimeline}
                    variant="secondary"
                    style={styles.actionButton}
                    icon={<Activity size={18} color={theme.colors.text.primary} />}
                  />
                </View>

                <Card style={styles.summaryCard}>
                  <Text style={[styles.summaryTitle, { color: theme.colors.text.primary }]}>
                    Project Summary
                  </Text>

                  <Text style={[styles.summaryText, { color: theme.colors.text.secondary }]}>
                    This dashboard shows real data from MongoDB. It summarizes cases,
                    evidence uploads, metadata extraction status, and generated timeline events.
                  </Text>

                  <View style={styles.summaryRow}>
                    <Upload size={16} color={theme.colors.primary} />
                    <Text style={[styles.summarySmall, { color: theme.colors.text.secondary }]}>
                      Supported evidence: PDF, DOC, DOCX, Images, TXT, LOG
                    </Text>
                  </View>
                </Card>
              </View>

              <View style={[isWeb && styles.webColRight]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
                    RECENT TIMELINE ACTIVITY
                  </Text>
                </View>

                <Card style={styles.activityCard}>
                  {recentActivity.length === 0 ? (
                    <View style={styles.emptyActivity}>
                      <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                        No activity yet
                      </Text>
                      <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                        Upload evidence and run metadata extraction to generate timeline activity.
                      </Text>
                    </View>
                  ) : (
                    recentActivity.map((item, index) => (
                      <View key={item.id}>
                        <View style={styles.activityItem}>
                          <View
                            style={[
                              styles.activityDot,
                              { backgroundColor: getActivityColor(item.type) },
                            ]}
                          />

                          <View style={styles.activityContent}>
                            <Text
                              numberOfLines={1}
                              style={[styles.activityTitle, { color: theme.colors.text.primary }]}
                            >
                              {item.title}
                            </Text>

                            <Text
                              numberOfLines={2}
                              style={[styles.activityDesc, { color: theme.colors.text.secondary }]}
                            >
                              {item.description}
                            </Text>
                          </View>

                          <Text style={[styles.activityTime, { color: theme.colors.text.muted }]}>
                            {item.time}
                          </Text>
                        </View>

                        {index !== recentActivity.length - 1 ? (
                          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                        ) : null}
                      </View>
                    ))
                  )}
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
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderBottomWidth: 1,
    paddingBottom: 16,
    gap: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 4,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '800',
  },
  emailText: {
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  loadingBox: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'column',
    marginBottom: 16,
    gap: 16,
  },
  statsRowWeb: {
    flexDirection: 'row',
  },
  statTouchable: {
    flex: 1,
  },
  statCard: {
    flex: 1,
    alignItems: 'flex-start',
    padding: 18,
  },
  statIconDef: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 14,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  selectedText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  detailPanel: {
    padding: 0,
    marginBottom: 12,
    overflow: 'hidden',
  },
  detailHeader: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  detailSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  clickHint: {
    fontSize: 11,
    fontWeight: '700',
    alignSelf: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  detailDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
  },
  detailContent: {
    flex: 1,
  },
  detailItemTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  detailItemSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  detailItemMeta: {
    fontSize: 11,
    marginTop: 5,
  },
  emptyDetail: {
    padding: 18,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionsGrid: {
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    width: '100%',
  },
  summaryCard: {
    padding: 18,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  summarySmall: {
    fontSize: 12,
    flex: 1,
  },
  activityCard: {
    padding: 0,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  activityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontWeight: '800',
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
  divider: {
    height: 1,
  },
  settingsIcon: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  emptyActivity: {
    padding: 22,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  webSplitContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  webColLeft: {
    flex: 1,
  },
  webColRight: {
    flex: 1,
  },
});
