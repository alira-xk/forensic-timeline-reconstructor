import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SettingsPopup } from '../components/SettingsPopup';
import { useTheme } from '../theme/ThemeContext';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { FileText, Clock, Plus, Activity, Shield, AlertTriangle, Settings } from 'lucide-react-native';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
    NativeStackScreenProps<RootStackParamList>
>;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width > 768;
    const [showSettings, setShowSettings] = useState(false);

    return (
        <ScreenWrapper fullWidth withSidebar={true}>
            <SettingsPopup visible={showSettings} onClose={() => setShowSettings(false)} anchorPosition={{ top: 80, right: 24 }} />
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header - Removed Toggle since Sidebar handles it on Web, but Mobile needs it? 
            Wait, Mobile has no sidebar. So keep toggle for Mobile only? 
            Actually, let's keep it simple. Dashboard is the main "Workspace".
            On Web, Sidebar has branding. On Mobile, we need branding here.
         */}
                <View style={[styles.header, { borderColor: theme.colors.border }]}>
                    <View>
                        <Text style={[styles.brandTitle, { color: theme.colors.text.secondary }]}>INVESTIGATOR WORKSPACE</Text>
                        <Text style={[styles.welcome, { color: theme.colors.text.primary }]}>Welcome back, Investigator</Text>
                    </View>
                    <View style={styles.headerRight}>
                        {/* Mobile Settings Icon - Sidebar handles this on Web */}
                        {!isWeb && (
                            <TouchableOpacity
                                onPress={() => setShowSettings(true)}
                                style={[styles.settingsIcon, { backgroundColor: theme.colors.surfaceHighlight }]}
                            >
                                <Settings size={20} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        )}
                        <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHighlight, borderColor: theme.colors.border }]}>
                            <Shield size={14} color={theme.colors.primary} />
                            <Text style={[styles.badgeText, { color: theme.colors.text.primary }]}>AUTH LEVEL 3</Text>
                        </View>
                    </View>
                </View>

                {/* Stats Grid - Responsive */}
                <View style={[styles.statsRow, isWeb && styles.statsRowWeb]}>
                    <Card style={styles.statCard}>
                        <View style={[styles.statIconDef, { backgroundColor: theme.colors.surfaceHighlight }]}>
                            <FileText color={theme.colors.primary} size={20} />
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>12</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Active Cases</Text>
                    </Card>

                    <Card style={styles.statCard}>
                        <View style={[styles.statIconDef, { backgroundColor: theme.colors.surfaceHighlight }]}>
                            <Clock color={theme.colors.status.warning} size={20} />
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>4</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Pending Analysis</Text>
                    </Card>

                    <Card style={styles.statCard}>
                        <View style={[styles.statIconDef, { backgroundColor: theme.colors.surfaceHighlight }]}>
                            <AlertTriangle color={theme.colors.status.error} size={20} />
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>2</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Flagged Conflicts</Text>
                    </Card>
                </View>

                {/* Web Split View Container */}
                <View style={[isWeb && styles.webSplitContainer]}>

                    {/* Left Column: Actions */}
                    <View style={[isWeb && styles.webColLeft]}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>QUICK ACTIONS</Text>
                        </View>

                        <View style={styles.actionsGrid}>
                            <Button
                                title="Initiate New Case"
                                onPress={() => navigation.navigate('CreateCase')}
                                variant="primary"
                                style={styles.actionButton}
                                icon={<Plus size={18} color={theme.colors.text.inverse} />}
                            />
                            <Button
                                title="View Active Timeline"
                                onPress={() => navigation.navigate('Timeline')}
                                variant="secondary"
                                style={styles.actionButton}
                                icon={<Activity size={18} color={theme.colors.text.primary} />}
                            />
                        </View>
                    </View>

                    {/* Right Column: Activity */}
                    <View style={[isWeb && styles.webColRight]}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>RECENT AUDIT LOGS</Text>
                        </View>

                        <Card style={styles.activityCard}>
                            <View style={styles.activityItem}>
                                <View style={[styles.activityDot, { backgroundColor: theme.colors.status.success }]} />
                                <View style={styles.activityContent}>
                                    <Text style={[styles.activityTitle, { color: theme.colors.text.primary }]}>Extraction Complete</Text>
                                    <Text style={[styles.activityDesc, { color: theme.colors.text.secondary }]}>Case #4029 - iPhone 13 Pro dump verified</Text>
                                </View>
                                <Text style={[styles.activityTime, { color: theme.colors.text.muted }]}>09:42 AM</Text>
                            </View>

                            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                            <View style={styles.activityItem}>
                                <View style={[styles.activityDot, { backgroundColor: theme.colors.status.info }]} />
                                <View style={styles.activityContent}>
                                    <Text style={[styles.activityTitle, { color: theme.colors.text.primary }]}>Evidence Ingested</Text>
                                    <Text style={[styles.activityDesc, { color: theme.colors.text.secondary }]}>Case #4021 - CCTV Footage added to index</Text>
                                </View>
                                <Text style={[styles.activityTime, { color: theme.colors.text.muted }]}>08:15 AM</Text>
                            </View>
                        </Card>
                    </View>

                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
        borderBottomWidth: 1,
        paddingBottom: 16,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    brandTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    welcome: {
        fontSize: 20,
        fontWeight: '700',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'column',
        marginBottom: 32,
        gap: 16,
    },
    statsRowWeb: {
        flexDirection: 'row',
    },
    statCard: {
        flex: 1,
        alignItems: 'flex-start',
        padding: 24,
    },
    statIconDef: {
        padding: 8,
        borderRadius: 4,
        marginBottom: 16,
    },
    statValue: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -1,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    sectionHeader: {
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    actionsGrid: {
        marginBottom: 32,
        gap: 8,
    },
    actionButton: {
        width: '100%',
    },
    activityCard: {
        padding: 0,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    activityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontWeight: '600',
        fontSize: 14,
    },
    activityDesc: {
        fontSize: 12,
        marginTop: 2,
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
    // Responsive Utilities
    webSplitContainer: {
        flexDirection: 'row',
        gap: 32,
    },
    webColLeft: {
        flex: 1,
    },
    webColRight: {
        flex: 1,
    }
});
