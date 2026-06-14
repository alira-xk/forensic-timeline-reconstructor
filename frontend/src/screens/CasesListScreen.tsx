import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Calendar, ChevronRight, FolderOpen, Plus, RefreshCcw, Search } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { SearchInput } from '../components/SearchInput';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ListSkeleton } from '../components/Skeleton';
import { useTheme } from '../theme/ThemeContext';
import { getCases, CaseItem } from '../services/caseService';
import { RootStackParamList, MainTabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'CasesList'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const CasesListScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 900;
  const [searchQuery, setSearchQuery] = useState('');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await getCases();
      setCases(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCases();
    }, [])
  );

  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.status.toLowerCase().includes(q)
    );
  }, [cases, searchQuery]);

  const renderCaseItem = ({ item }: { item: CaseItem }) => {
    const isActive = item.status === 'open';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.caseTouchTarget}
        onPress={() => navigation.navigate('CaseDetail', { caseId: item._id })}
      >
        <Card glass style={styles.caseCard}>
          <View style={styles.cardInfo}>
            <View style={styles.iconContainer}>
              <FolderOpen
                size={22}
                color={isActive ? theme.colors.status.success : theme.colors.status.warning}
              />
            </View>
            <View style={styles.detailsContainer}>
              <Text style={[styles.caseTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.caseDescription, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                {item.description || 'No description available'}
              </Text>

              <View style={styles.metaRow}>
                <View style={[styles.statusBadge, { backgroundColor: isActive ? `${theme.colors.status.success}1A` : `${theme.colors.status.warning}1A` }]}>
                  <Text style={[styles.statusText, { color: isActive ? theme.colors.status.success : theme.colors.status.warning }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.dateContainer}>
                  <Calendar size={12} color={theme.colors.text.muted} style={{ marginRight: 4 }} />
                  <Text style={[styles.cardDate, { color: theme.colors.text.muted }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            <ChevronRight size={20} color={theme.colors.text.muted} style={styles.chevron} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper fullWidth withSidebar={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Investigations</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              Search, review, and continue active forensic work.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Refresh cases"
              onPress={fetchCases}
              style={[styles.iconButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised }]}
            >
              <RefreshCcw size={17} color={theme.colors.text.secondary} />
            </TouchableOpacity>
            <Button
              title="New Case"
              onPress={() => navigation.navigate('CreateCase')}
              icon={<Plus size={17} color="#FFFFFF" />}
              style={styles.newCaseButton}
            />
          </View>
        </View>

        <SearchInput
          placeholder="Search by title, description or status..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {loading && cases.length === 0 ? (
          <ListSkeleton rows={5} />
        ) : (
          <FlatList
            key="case-register"
            data={filteredCases}
            numColumns={1}
            keyExtractor={(item) => item._id}
            renderItem={renderCaseItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Search size={48} color={theme.colors.text.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                  {searchQuery ? 'No cases match your search query.' : 'No cases found.\nCreate a case to get started.'}
                </Text>
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
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
  },
  header: {
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
  },
  headerCopy: {
    flex: 1,
    minWidth: 240,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '800',
    marginBottom: 7,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCaseButton: {
    minWidth: 132,
  },
  listContent: {
    paddingBottom: 48,
  },
  caseCard: {
    padding: 17,
    marginBottom: 10,
    flex: 1,
  },
  caseTouchTarget: {
    flex: 1,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailsContainer: {
    flex: 1,
  },
  caseTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  caseDescription: {
    fontSize: 13,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginRight: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 16,
    opacity: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
