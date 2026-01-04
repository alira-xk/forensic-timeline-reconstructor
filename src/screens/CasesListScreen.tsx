import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { useTheme } from '../theme/ThemeContext';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { ChevronRight, Folder, AlertCircle } from 'lucide-react-native';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'CasesList'>,
    NativeStackScreenProps<RootStackParamList>
>;

const CASES = [
    { id: '4029', name: 'Operation Skyfall', status: 'Active', date: '2023-10-24', priority: 'High' },
    { id: '4021', name: 'Red Metro Breach', status: 'Analysis', date: '2023-10-20', priority: 'Medium' },
    { id: '3992', name: 'Unknown Subject #9', status: 'Closed', date: '2023-09-15', priority: 'Low' },
];

export const CasesListScreen: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme();
    const [search, setSearch] = useState('');

    const renderItem = ({ item }: { item: typeof CASES[0] }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
        >
            <Card style={styles.caseCard}>
                <View style={[styles.caseIcon, { backgroundColor: theme.colors.surfaceHighlight }]}>
                    <Folder size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.caseInfo}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.caseName, { color: theme.colors.text.primary }]}>{item.name}</Text>
                        {item.priority === 'High' && (
                            <View style={[styles.priorityBadge, { backgroundColor: '#FEF2F2' }]}>
                                <AlertCircle size={10} color={theme.colors.status.error} />
                                <Text style={[styles.priorityText, { color: theme.colors.status.error }]}>PRIORITY</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.caseMeta, { color: theme.colors.text.secondary }]}>Case #{item.id} • Last Access: {item.date}</Text>
                </View>
                <View style={styles.caseStatus}>
                    <Text style={[styles.statusText, {
                        color: item.status === 'Active' ? theme.colors.status.success : theme.colors.text.secondary
                    }]}>
                        {item.status}
                    </Text>
                    <ChevronRight size={16} color={theme.colors.text.muted} />
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper withSidebar={true}>
            <View style={styles.header}>
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>DATABASE</Text>
                <Text style={[styles.title, { color: theme.colors.text.primary }]}>All Cases</Text>
            </View>

            {/* Filter Bar (Collapsible / Inline) */}
            <View style={[styles.controlsContainer, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.searchRow}>
                    <Input
                        placeholder="Search cases..."
                        value={search}
                        onChangeText={setSearch}
                        style={styles.searchBar}
                    />
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                >
                    <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.colors.border }]}>
                        <Text style={[styles.filterText, { color: theme.colors.text.secondary }]}>Status: All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.colors.border }]}>
                        <Text style={[styles.filterText, { color: theme.colors.text.secondary }]}>Date Range</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.colors.border }]}>
                        <Text style={[styles.filterText, { color: theme.colors.text.secondary }]}>Assigned To</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtnActive, { backgroundColor: theme.colors.surfaceHighlight, borderColor: theme.colors.primary }]}>
                        <Text style={[styles.filterTextActive, { color: theme.colors.primary }]}>Sort: Recent</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <FlatList
                data={CASES}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 16,
    },
    controlsContainer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    searchRow: {
        marginBottom: 12,
    },
    searchBar: {
        marginBottom: 0,
    },
    filterRow: {
        gap: 8,
    },
    filterBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    filterBtnActive: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '500',
    },
    filterTextActive: {
        fontSize: 12,
        fontWeight: '700',
    },
    list: {
        padding: 24,
    },
    caseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    caseIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    caseInfo: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    caseName: {
        fontSize: 15,
        fontWeight: '600',
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 9,
        fontWeight: '700',
    },
    caseMeta: {
        fontSize: 11,
        marginTop: 4,
    },
    caseStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
});
