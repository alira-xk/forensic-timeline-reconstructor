import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  Hash,
  Image,
  RefreshCcw,
  Search,
  Upload,
} from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { getTimelineByCase, TimelineEvent } from '../services/timelineService';
import { exportTimelineCsv, exportTimelineJson } from '../services/exportService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Timeline'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const TimelineScreen: React.FC<Props> = ({ route }) => {
  const { theme } = useTheme();

  const caseId = (route.params as { caseId?: string } | undefined)?.caseId || '';

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  const loadTimeline = async (showLoader = true) => {
    if (!caseId) {
      setEvents([]);
      setError('No case selected. Open timeline from a case detail screen.');
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');
      const data = await getTimelineByCase(caseId);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTimeline(true);
    }, [caseId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTimeline(false);
  };

  const handleExportJSON = async () => {
    if (!caseId) {
      Alert.alert('No Case Selected', 'Open timeline from a case detail screen first.');
      return;
    }

    try {
      const result = await exportTimelineJson(caseId);
      Alert.alert('Export Ready', `${result.filename} has been downloaded.`);
    } catch (error: any) {
      Alert.alert('Export Failed', error.message || 'Unable to export JSON file.');
    }
  };

  const handleExportCSV = async () => {
    if (!caseId) {
      Alert.alert('No Case Selected', 'Open timeline from a case detail screen first.');
      return;
    }

    try {
      const result = await exportTimelineCsv(caseId);
      Alert.alert('Export Ready', `${result.filename} has been downloaded.`);
    } catch (error: any) {
      Alert.alert('Export Failed', error.message || 'Unable to export CSV file.');
    }
  };

  const filterOptions = useMemo(() => {
    const eventTypes = Array.from(new Set(events.map((event) => event.eventType)));
    return ['All', ...eventTypes];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesFilter = filter === 'All' || event.eventType === filter;

      const searchableText = [
        event.eventType,
        event.description,
        event.eventSource,
        event.originalTimestamp,
        event.fileRecord?.originalName,
        event.fileRecord?.fileType,
        event.fileRecord?.sha256Hash,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);

      return matchesFilter && matchesSearch;
    });
  }, [events, filter, search]);

  const formatDate = (dateValue: string) => {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };

  const formatTime = (dateValue: string) => {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventColor = (eventType: string) => {
    const normalized = eventType.toUpperCase();

    if (normalized.includes('FAILED')) {
      return theme.colors.status.error;
    }

    if (normalized.includes('LOG')) {
      return theme.colors.status.info;
    }

    if (normalized.includes('IMAGE')) {
      return theme.colors.primary;
    }

    if (normalized.includes('DOC') || normalized.includes('PDF')) {
      return theme.colors.status.warning;
    }

    if (normalized.includes('UPLOADED')) {
      return theme.colors.status.success;
    }

    return theme.colors.primary;
  };

  const getEventIcon = (eventType: string) => {
    const color = getEventColor(eventType);
    const normalized = eventType.toUpperCase();

    if (normalized.includes('IMAGE')) {
      return <Image size={17} color={color} />;
    }

    if (normalized.includes('UPLOADED')) {
      return <Upload size={17} color={color} />;
    }

    if (normalized.includes('LOG')) {
      return <CalendarClock size={17} color={color} />;
    }

    return <FileText size={17} color={color} />;
  };

  const renderEvent = ({ item }: { item: TimelineEvent }) => {
    const color = getEventColor(item.eventType);

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timeColumn}>
          <Text style={[styles.timeText, { color: theme.colors.text.primary }]}>
            {formatTime(item.timestamp)}
          </Text>
          <Text style={[styles.dateText, { color: theme.colors.text.muted }]}>
            {formatDate(item.timestamp)}
          </Text>
        </View>

        <View style={styles.lineWrapper}>
          <View
            style={[
              styles.dot,
              {
                borderColor: color,
                backgroundColor: theme.colors.background,
              },
            ]}
          />
          <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
        </View>

        <View
          style={[
            styles.eventCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderLeftColor: color,
            },
          ]}
        >
          <View style={styles.eventHeader}>
            <View style={styles.eventTypeGroup}>
              {getEventIcon(item.eventType)}
              <Text style={[styles.eventType, { color }]}>
                {item.eventType}
              </Text>
            </View>

            <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.typeBadgeText, { color }]}>
                {item.fileRecord?.fileType || 'EVENT'}
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: theme.colors.text.primary }]}>
            {item.description || 'No description provided.'}
          </Text>

          <View style={styles.metaBlock}>
            <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
              File: {item.fileRecord?.originalName || 'N/A'}
            </Text>

            <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
              Source: {item.eventSource || 'N/A'}
            </Text>

            <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
              Raw Timestamp: {item.originalTimestamp || 'N/A'}
            </Text>
          </View>

          {item.fileRecord?.sha256Hash ? (
            <View style={styles.hashRow}>
              <Hash size={13} color={theme.colors.text.muted} />
              <Text
                numberOfLines={1}
                style={[styles.hashText, { color: theme.colors.text.muted }]}
              >
                SHA-256: {item.fileRecord.sha256Hash}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper withSidebar={true}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View
          style={[
            styles.headerContainer,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={[styles.screenTitle, { color: theme.colors.text.primary }]}>
                Forensic Timeline
              </Text>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.statusRow}>
                <CheckCircle2 size={14} color={theme.colors.status.success} />
                <Text style={[styles.statusText, { color: theme.colors.status.success }]}>
                  {caseId ? 'Case Loaded' : 'No Case Selected'}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleExportJSON}
                style={[styles.actionButton, { borderColor: theme.colors.border }]}
              >
                <Download size={15} color={theme.colors.text.secondary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.text.secondary }]}>
                  JSON
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleExportCSV}
                style={[styles.actionButton, { borderColor: theme.colors.border }]}
              >
                <Download size={15} color={theme.colors.text.secondary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.text.secondary }]}>
                  CSV
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => loadTimeline(true)}
                style={[styles.actionButton, { borderColor: theme.colors.border }]}
              >
                <RefreshCcw size={15} color={theme.colors.text.secondary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.text.secondary }]}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.contentConstrainer}>
          <View style={styles.searchSection}>
            <View style={styles.searchWrapper}>
              <View style={styles.searchIcon}>
                <Search size={16} color={theme.colors.text.secondary} />
              </View>

              <Input
                placeholder="Search event type, file name, source, hash, or description..."
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              {filterOptions.map((item) => {
                const active = item === filter;

                return (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.8}
                    onPress={() => setFilter(item)}
                    style={[
                      styles.filterPill,
                      {
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        backgroundColor: active
                          ? theme.colors.surfaceHighlight
                          : 'transparent',
                      },
                    ]}
                  >
                    <Filter
                      size={12}
                      color={active ? theme.colors.primary : theme.colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: active
                            ? theme.colors.primary
                            : theme.colors.text.secondary,
                          fontWeight: active ? '800' : '600',
                        },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.summaryBar, { backgroundColor: theme.colors.surfaceHighlight }]}>
            <Text style={[styles.summaryText, { color: theme.colors.text.secondary }]}>
              Total Events: {events.length}
            </Text>
            <Text style={[styles.summaryText, { color: theme.colors.text.secondary }]}>
              Showing: {filteredEvents.length}
            </Text>
            <Text style={[styles.summaryText, { color: theme.colors.text.secondary }]}>
              Case: {caseId ? `#${caseId.slice(-6).toUpperCase()}` : 'N/A'}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.stateText, { color: theme.colors.text.secondary }]}>
                Loading timeline events...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <AlertCircle size={30} color={theme.colors.status.error} />
              <Text style={[styles.errorText, { color: theme.colors.status.error }]}>
                {error}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredEvents}
              renderItem={renderEvent}
              keyExtractor={(item) => item._id}
              contentContainerStyle={[
                styles.list,
                filteredEvents.length === 0 && styles.emptyList,
              ]}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <Download size={34} color={theme.colors.text.muted} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                    No timeline events found
                  </Text>
                  <Text style={[styles.stateText, { color: theme.colors.text.secondary }]}>
                    Upload evidence and run metadata extraction from the case detail screen.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerContent: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  divider: {
    width: 1,
    height: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  contentConstrainer: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: 15,
    zIndex: 2,
  },
  searchInput: {
    marginBottom: 0,
    paddingLeft: 38,
  },
  filterContainer: {
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  summaryBar: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '800',
  },
  list: {
    padding: 24,
    paddingBottom: 44,
  },
  emptyList: {
    flexGrow: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timeColumn: {
    width: 98,
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingRight: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  dateText: {
    fontSize: 10,
    marginTop: 3,
  },
  lineWrapper: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginTop: 11,
    zIndex: 2,
  },
  line: {
    position: 'absolute',
    top: 0,
    bottom: -14,
    width: 1,
  },
  eventCard: {
    flex: 1,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 16,
    padding: 15,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
    gap: 10,
  },
  eventTypeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  metaBlock: {
    marginTop: 10,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 17,
  },
  hashRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hashText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  centerState: {
    flex: 1,
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 14,
  },
});
