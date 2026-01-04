import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Card } from '../components/Card';
import { useTheme } from '../theme/ThemeContext';
import { MapPin, MessageSquare, Phone, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react-native';

const EVENTS = [
    { id: '1', time: '09:41:00', date: '2023-10-24', type: 'message', content: 'SMS Received: "Meet at the docks"', source: 'iPhone 13', verified: true },
    { id: '2', time: '10:15:22', date: '2023-10-24', type: 'location', content: 'GPS Ping: Warehouse District', source: 'Cloud Data', verified: true },
    { id: '3', time: '10:30:05', date: '2023-10-24', type: 'call', content: 'Outgoing Call (2m 14s)', source: 'Call Logs', verified: false, inferred: true },
    { id: '4', time: '10:45:00', date: '2023-10-24', type: 'conflict', content: 'Location Anomaly detected', source: 'System', conflict: true },
];

export const TimelineScreen: React.FC = () => {
    const { theme } = useTheme();
    const [filter, setFilter] = useState('All');

    const getIcon = (type: string) => {
        switch (type) {
            case 'message': return <MessageSquare size={16} color={theme.colors.accent} />;
            case 'location': return <MapPin size={16} color={theme.colors.status.info} />;
            case 'call': return <Phone size={16} color={theme.colors.status.success} />;
            case 'conflict': return <AlertTriangle size={16} color={theme.colors.status.error} />;
            default: return <FileText size={16} color={theme.colors.text.secondary} />;
        }
    };

    const getStatusColor = (item: typeof EVENTS[0]) => {
        if (item.conflict) return theme.colors.status.error;
        if (item.inferred) return theme.colors.status.warning;
        return theme.colors.status.success;
    };

    const renderEvent = ({ item }: { item: typeof EVENTS[0] }) => {
        const statusColor = getStatusColor(item);

        // Mock data logic for new fields (normally would be in item)
        const confidence = item.conflict ? 'LOW' : (item.inferred ? 'MEDIUM' : 'HIGH');
        const origin = item.type === 'location' ? 'CLOUD API' : (item.type === 'message' ? 'SIM EXTRACTION' : 'DEVICE LOGS');

        return (
            <View style={styles.timelineRow}>
                {/* Timestamp Column - Compact */}
                <View style={[styles.timeColumn, { borderRightColor: theme.colors.border }]}>
                    <Text style={[styles.timeText, { color: theme.colors.text.primary }]}>{item.time}</Text>
                    <Text style={[styles.dateText, { color: theme.colors.text.muted }]}>{item.date}</Text>
                </View>

                {/* Visual Line & Dot */}
                <View style={styles.lineWrapper}>
                    <View style={[styles.dot, {
                        borderColor: statusColor,
                        backgroundColor: item.conflict ? theme.colors.status.error : theme.colors.surface
                    }]} />
                    <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
                </View>

                {/* Event Content - Dense & Structured */}
                <View style={styles.eventContent}>
                    <Card style={[styles.eventCard, {
                        borderLeftColor: statusColor,
                        borderLeftWidth: 3, // Thinner accent
                        backgroundColor: item.conflict ? 'rgba(254, 226, 226, 0.1)' : theme.colors.surface
                    }]}>

                        {/* Header Row: Type Icon | Source | Confidence */}
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.badgeGroup}>
                                {getIcon(item.type)}
                                <Text style={[styles.sourceText, { color: theme.colors.text.primary }]}>{item.source}</Text>
                                <Text style={[styles.metaDivider, { color: theme.colors.border }]}>|</Text>
                                <Text style={[styles.originText, { color: theme.colors.text.muted }]}>{origin}</Text>
                            </View>

                            <View style={styles.metaRight}>
                                <Text style={[styles.confidenceLabel, {
                                    color: confidence === 'HIGH' ? theme.colors.status.success : (confidence === 'LOW' ? theme.colors.status.error : theme.colors.status.warning)
                                }]}>
                                    {confidence} CONFIDENCE
                                </Text>
                            </View>
                        </View>

                        {/* Main Content */}
                        <Text style={[styles.eventText, { color: theme.colors.text.primary }]}>{item.content}</Text>

                        {/* Footer (if expandable details needed later) */}
                    </Card>
                </View>
            </View>
        );
    };

    return (
        <ScreenWrapper withSidebar={true}>
            {/* Consolidated Header & Filter Bar */}
            <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                <View style={styles.headerContent}> {/* Flex Row Container */}

                    {/* Left: Title & Status */}
                    <View style={styles.headerLeft}>
                        <Text style={[styles.screenTitle, { color: theme.colors.text.primary }]}>Timeline</Text>
                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                        <View style={styles.statusRow}>
                            <CheckCircle2 size={14} color={theme.colors.status.success} />
                            <Text style={[styles.statusText, { color: theme.colors.status.success }]}>Analysis Complete</Text>
                        </View>
                    </View>

                    {/* Right: Filters */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterContainer}
                        style={{ flexGrow: 0 }} // Don't expand infinitely
                    >
                        {['All', 'Messages', 'Calls', 'Locations', 'Conflicts'].map(f => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => setFilter(f)}
                                style={[
                                    styles.filterPill,
                                    f === filter
                                        ? { backgroundColor: theme.colors.surfaceHighlight, borderColor: theme.colors.border }
                                        : { borderColor: 'transparent' }
                                ]}
                            >
                                <Text style={[
                                    styles.pillText,
                                    { color: f === filter ? theme.colors.primary : theme.colors.text.secondary, fontWeight: f === filter ? '700' : '500' }
                                ]}>{f}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            <View style={styles.contentConstrainer}> {/* Constrain content width as well */}
                <View style={[styles.headerRow, { backgroundColor: theme.colors.surfaceHighlight }]}>
                    <Text style={[styles.headerLabel, { color: theme.colors.text.secondary }]}>TIMESTAMP</Text>
                    <Text style={[styles.headerLabel, { color: theme.colors.text.secondary, marginLeft: 24 }]}>EVENT DETAILS</Text>
                </View>

                <FlatList
                    data={EVENTS}
                    renderItem={renderEvent}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerContent: {
        maxWidth: 1024,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    divider: {
        width: 1,
        height: 16,
    },
    contentConstrainer: {
        maxWidth: 1024,
        width: '100%',
        alignSelf: 'center',
        flex: 1,
    },
    screenTitle: {
        fontSize: 16, // Smaller, more compact
        fontWeight: '700',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        // Removed marginTop
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    filterContainer: {
        gap: 8,
    },
    filterPill: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 12,
        letterSpacing: 0.5,
    },
    filterTab: {
        paddingVertical: 12,
        marginRight: 24,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    headerRow: {
        flexDirection: 'row',
        paddingHorizontal: 24, // Matched with headerContent
        paddingVertical: 8,
    },
    headerLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    list: {
        padding: 16,
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    timeColumn: {
        width: 85,
        alignItems: 'flex-end',
        paddingTop: 4, // Align with first line of text
        marginRight: 12,
        paddingRight: 12, // Visual separator space
        borderRightWidth: 1, // Vertical divider line
        borderRightColor: 'rgba(0,0,0,0.05)',
    },
    timeText: {
        fontWeight: '700',
        fontSize: 12,
        fontVariant: ['tabular-nums'],
    },
    dateText: {
        fontSize: 10,
        marginTop: 2,
        opacity: 0.8,
    },
    lineWrapper: {
        alignItems: 'center',
        width: 16,
        marginRight: 8,
        marginLeft: -9, // Pull back to align with border
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        marginTop: 8,
        zIndex: 5,
    },
    line: {
        flex: 1,
        width: 1,
        position: 'absolute',
        top: 0,
        bottom: 0,
    },
    eventContent: {
        flex: 1,
        paddingBottom: 8,
    },
    eventCard: {
        marginBottom: 0,
        padding: 10,
        borderRadius: 4, // Sharper corners for pro feel
        borderWidth: 1,
        borderColor: 'transparent', // Let shadow define edges or subtle border
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    badgeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sourceText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaDivider: {
        fontSize: 10,
        marginHorizontal: 2,
    },
    originText: {
        fontSize: 10,
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    metaRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    confidenceLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    eventText: {
        fontSize: 13, // Slightly smaller for density
        lineHeight: 18,
        fontWeight: '500',
    },
});
