import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { LayoutDashboard, FolderOpen, Activity, User } from 'lucide-react-native';
import { SettingsPopup } from './SettingsPopup';
import { AppLogo } from './AppLogo';

export const Sidebar: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();
    const [showSettings, setShowSettings] = React.useState(false);

    const navItems = [
        { label: 'OVERVIEW', icon: LayoutDashboard, route: 'Dashboard' },
        { label: 'CASES', icon: FolderOpen, route: 'CasesList' },
        { label: 'TIMELINE', icon: Activity, route: 'Timeline' },
    ];

    return (
        <View style={[styles.container, {
            backgroundColor: theme.colors.surface,
            borderRightColor: theme.colors.border,
            borderRightWidth: 1
        }]}>
            <View style={styles.header}>
                <View style={styles.logoBadge}>
                    <AppLogo size={32} />
                </View>
                <View>
                    <Text style={[styles.brandTitle, { color: theme.colors.text.primary }]}>FORENSIC</Text>
                    <Text style={[styles.brandSubtitle, { color: theme.colors.text.secondary }]}>TIMELINE</Text>
                </View>
            </View>

            {/* Navigation Items */}
            <View style={styles.navContainer}>
                {navItems.map((item) => (
                    <TouchableOpacity
                        key={item.route}
                        style={[styles.navItem, {
                            backgroundColor: 'transparent' // Active state logic would go here
                        }]}
                        onPress={() => navigation.navigate(item.route)}
                    >
                        <item.icon size={20} color={theme.colors.text.secondary} />
                        <Text style={[styles.navLabel, { color: theme.colors.text.secondary }]}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Case Summary Widget (Web specific) */}
            <View style={[styles.statsWidget, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.statsTitle, { color: theme.colors.text.muted }]}>ACTIVE CASE SUMMARY</Text>

                <View style={styles.statRow}>
                    <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Pending Analysis</Text>
                    <Text style={[styles.statValue, { color: theme.colors.accent }]}>12</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Conflicts</Text>
                    <Text style={[styles.statValue, { color: theme.colors.status.error }]}>3</Text>
                </View>
                <View style={[styles.statRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>Processing</Text>
                    <Text style={[styles.statValue, { color: theme.colors.status.success, fontSize: 10 }]}>COMPLETE</Text>
                </View>
            </View>

            {/* Footer Actions */}
            <View style={[styles.footer, { borderTopColor: theme.colors.border, borderTopWidth: 1 }]}>

                <TouchableOpacity
                    style={styles.profileItem}
                    onPress={() => setShowSettings(true)}
                >
                    <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceHighlight }]}>
                        <User size={16} color={theme.colors.primary} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: theme.colors.text.primary }]}>Hassan</Text>
                        <Text style={[styles.profileRole, { color: theme.colors.text.muted }]}>Lead Investigator</Text>
                    </View>
                </TouchableOpacity>

                <SettingsPopup visible={showSettings} onClose={() => setShowSettings(false)} anchorPosition={{ bottom: 80, left: 24 }} />

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 260,
        height: '100%',
        padding: 24,
        display: Platform.OS === 'web' ? 'flex' : 'none', // Only show on web
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 48,
    },
    logoBadge: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
        lineHeight: 18,
    },
    brandSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 1,
        lineHeight: 18,
    },
    navContainer: {
        flex: 1,
        gap: 8,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    navLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    footer: {
        paddingTop: 24,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 13,
        fontWeight: '600',
    },
    profileRole: {
        fontSize: 10,
    },
    statsWidget: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
    },
    statsTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 12,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    }
});
