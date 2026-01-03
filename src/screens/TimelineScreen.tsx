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

        return (
            <View style={styles.timelineRow}>
                {/* Timestamp Column */}
                <View style={styles.timeColumn}>
                    <Text style={[styles.timeText, { color: theme.colors.text.primary }]}>{item.time}</Text>
                    <Text style={[styles.dateText, { color: theme.colors.text.muted }]}>{item.date}</Text>
                </View>

                {/* Visual Line */}
                <View style={styles.lineWrapper}>
                    <View style={[styles.dot, {
                        borderColor: statusColor,
                        backgroundColor: theme.colors.surface
                    }]} />
                    <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
                </View>

                {/* Event Content */}
                <View style={styles.eventContent}>
                    <Card style={[styles.eventCard, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}>
                        <View style={styles.eventHeader}>
                            <View style={styles.sourceBadge}>
                                {getIcon(item.type)}
                                <Text style={[styles.sourceText, { color: theme.colors.text.secondary }]}>{item.source}</Text>
                            </View>
                            {item.conflict && <Text style={[styles.conflictBadge, { color: theme.colors.status.error }]}>CONFLICT</Text>}
                        </View>
                        <Text style={[styles.eventText, { color: theme.colors.text.primary }]}>{item.content}</Text>
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
        width: 80,
        alignItems: 'flex-end',
        paddingTop: 12,
        marginRight: 8,
    },
    timeText: {
        fontWeight: '700',
        fontSize: 13,
        fontVariant: ['tabular-nums'],
    },
    dateText: {
        fontSize: 10,
        marginTop: 2,
    },
    lineWrapper: {
        alignItems: 'center',
        width: 24,
        marginRight: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        marginTop: 16,
        zIndex: 1,
    },
    line: {
        flex: 1,
        width: 1,
        position: 'absolute',
        top: 16,
        bottom: -10,
    },
    eventContent: {
        flex: 1,
    },
    eventCard: {
        marginBottom: 4,
        padding: 8,
    },
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    sourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sourceText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    eventText: {
        fontSize: 14,
        lineHeight: 20,
    },
    conflictBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 4,
        borderRadius: 2,
    },
});
