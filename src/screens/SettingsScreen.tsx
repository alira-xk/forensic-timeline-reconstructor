import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { X, Moon, Sun, LogOut, User, ChevronRight, Info } from 'lucide-react-native';
import { Card } from '../components/Card';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, toggleTheme, isDark } = useTheme();

    const handleSignOut = () => {
        // Simulate sign out delay
        navigation.getParent()?.navigate('Login');
    };

    return (
        <ScreenWrapper style={{ backgroundColor: theme.colors.surfaceHighlight }}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text.primary }]}>System Settings</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <X size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>

                {/* User Profile Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>ACCOUNT</Text>
                    <Card style={styles.profileCard}>
                        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                            <User size={24} color="#FFF" />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, { color: theme.colors.text.primary }]}>Agent Hassan</Text>
                            <Text style={[styles.profileRole, { color: theme.colors.text.secondary }]}>Senior Investigator (Level 3)</Text>
                        </View>
                    </Card>
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>PREFERENCES</Text>

                    <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.rowLeft}>
                            {isDark ? <Moon size={20} color={theme.colors.primary} /> : <Sun size={20} color={theme.colors.primary} />}
                            <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        />
                    </View>
                </View>

                {/* System Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>SYSTEM</Text>

                    <TouchableOpacity style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.rowLeft}>
                            <Info size={20} color={theme.colors.text.secondary} />
                            <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>About System</Text>
                        </View>
                        <ChevronRight size={20} color={theme.colors.text.muted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: -1 }]}
                        onPress={handleSignOut}
                    >
                        <View style={styles.rowLeft}>
                            <LogOut size={20} color={theme.colors.status.error} />
                            <Text style={[styles.rowLabel, { color: theme.colors.status.error }]}>Sign Out</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.version, { color: theme.colors.text.muted }]}>
                    Forensic Reconstruction Suite v3.0.1 (Build 2401)
                </Text>

            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: 24,
        paddingTop: 0,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 0,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '700',
    },
    profileRole: {
        fontSize: 13,
        marginTop: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderWidth: 1,
        borderRadius: 8, // Using consistent border radius manually
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    version: {
        textAlign: 'center',
        fontSize: 11,
        marginTop: 8,
    }
});
