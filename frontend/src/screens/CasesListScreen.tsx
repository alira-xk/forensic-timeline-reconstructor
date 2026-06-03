import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  ChevronRight,
  Database,
  Folder,
  FolderPlus,
  RefreshCcw,
} from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { Card } from '../components/Card';
import { SearchInput } from '../components/SearchInput';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { getCases, CaseItem } from '../services/caseService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'CasesList'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const CasesListScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCases = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');
      const data = await getCases();
      setCases(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cases.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCases(true);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCases(false);
  };

  const filteredCases = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return cases;
    }

    return cases.filter((item) => {
      const title = item.title?.toLowerCase() || '';
      const description = item.description?.toLowerCase() || '';
      const status = item.status?.toLowerCase() || '';

      return (
        title.includes(keyword) ||
        description.includes(keyword) ||
        status.includes(keyword) ||
        item._id.toLowerCase().includes(keyword)
      );
    });
  }, [cases, search]);

  const formatDate = (dateValue: string) => {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    if (status === 'open' || status === 'in_progress') {
      return theme.colors.status.success;
    }

    if (status === 'archived') {
      return theme.colors.status.warning;
    }

    if (status === 'closed') {
      return theme.colors.text.secondary;
    }

    return theme.colors.primary;
  };

  const renderItem = ({ item }: { item: CaseItem }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('CaseDetail', { caseId: item._id })}
    >
      <Card style={[styles.caseCard, { borderColor: theme.colors.border }]}>
        <View style={[styles.caseIcon, { backgroundColor: theme.colors.surfaceHighlight }]}>
          <Folder size={22} color={theme.colors.primary} />
        </View>

        <View style={styles.caseInfo}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={[styles.caseName, { color: theme.colors.text.primary }]}
            >
              {item.title}
            </Text>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(item.status)}20` },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <Text
            numberOfLines={2}
            style={[styles.caseDescription, { color: theme.colors.text.secondary }]}
          >
            {item.description || 'No description provided.'}
          </Text>

          <Text style={[styles.caseMeta, { color: theme.colors.text.muted }]}>
            {item.caseNumber || `Case #${item._id.slice(-6).toUpperCase()}`} - Created: {formatDate(item.createdAt)}
          </Text>
        </View>

        <View style={styles.arrowBox}>
          <ChevronRight size={18} color={theme.colors.text.muted} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper withSidebar={true}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: theme.colors.surfaceHighlight }]}>
              <Database size={22} color={theme.colors.primary} />
            </View>

            <View>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                Case Database
              </Text>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                All Cases
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                View investigation cases stored in MongoDB.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('CreateCase')}
          >
            <FolderPlus size={17} color="#FFFFFF" />
            <Text style={styles.createButtonText}>New Case</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.controlsContainer, { borderBottomColor: theme.colors.border }]}>
          <SearchInput
            placeholder="Search by title, description, status, or case ID..."
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <View style={[styles.filterBtnActive, { backgroundColor: theme.colors.surfaceHighlight, borderColor: theme.colors.primary }]}>
              <Text style={[styles.filterTextActive, { color: theme.colors.primary }]}>
                Total: {cases.length}
              </Text>
            </View>

            <View style={[styles.filterBtn, { borderColor: theme.colors.border }]}>
              <Text style={[styles.filterText, { color: theme.colors.text.secondary }]}>
                Showing: {filteredCases.length}
              </Text>
            </View>

            <View style={[styles.filterBtn, { borderColor: theme.colors.border }]}>
              <Text style={[styles.filterText, { color: theme.colors.text.secondary }]}>
                Sort: Recent
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.colors.border }]}
              onPress={() => loadCases(true)}
              activeOpacity={0.8}
            >
              <RefreshCcw size={13} color={theme.colors.text.secondary} />
              <Text style={[styles.filterText, { color: theme.colors.text.secondary }]}>
                Refresh
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateText, { color: theme.colors.text.secondary }]}>
              Loading cases...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <AlertCircle size={28} color={theme.colors.status.error} />
            <Text style={[styles.errorText, { color: theme.colors.status.error }]}>
              {error}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => loadCases(true)}
              style={[styles.retryButton, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.retryText, { color: theme.colors.text.primary }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredCases}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              styles.list,
              filteredCases.length === 0 && styles.emptyList,
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Folder size={34} color={theme.colors.text.muted} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                  No cases found
                </Text>
                <Text style={[styles.stateText, { color: theme.colors.text.secondary }]}>
                  Create a new case or change your search keyword.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.createButtonLarge, { backgroundColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('CreateCase')}
                >
                  <FolderPlus size={17} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Create Case</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 18,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  controlsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  filterRow: {
    gap: 8,
    marginTop: 12,
  },
  filterBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  filterBtnActive: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    fontSize: 12,
    fontWeight: '800',
  },
  list: {
    padding: 24,
    gap: 14,
  },
  emptyList: {
    flexGrow: 1,
  },
  caseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  caseIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  caseInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  caseName: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  caseDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 7,
  },
  caseMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  arrowBox: {
    marginLeft: 12,
  },
  centerState: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  stateText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  errorText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 16,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
