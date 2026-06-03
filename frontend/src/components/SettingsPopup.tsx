import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Modal, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Moon, Sun, LogOut, User } from 'lucide-react-native';
import { Card } from './Card';
import { useAuth } from '../auth/AuthContext';

interface SettingsPopupProps {
    visible: boolean;
    onClose: () => void;
    anchorPosition?: { top?: number; bottom?: number; left?: number; right?: number };
}

export const SettingsPopup: React.FC<SettingsPopupProps> = ({ visible, onClose, anchorPosition }) => {
    const { theme, toggleTheme, isDark } = useTheme();
    const { user, signOut } = useAuth();

    const handleSignOut = async () => {
        onClose();
        await signOut();
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Card style={[
                    styles.popup,
                    { backgroundColor: theme.colors.panelStrong, borderColor: theme.colors.border },
                    anchorPosition ? anchorPosition : { bottom: 80, left: 80 } // Default for Sidebar bottom-left
                ]}>
                    <View style={styles.header}>
                        <View style={[styles.avatar, { backgroundColor: `${theme.colors.primary}18` }]}>
                            <User size={16} color={theme.colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.name, { color: theme.colors.text.primary }]} numberOfLines={1}>
                                {user?.name ?? 'Investigator'}
                            </Text>
                            <Text style={[styles.role, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                                {user?.email ?? 'Authenticated user'}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    <View style={styles.row}>
                        <View style={styles.iconRow}>
                            {isDark ? <Moon size={16} color={theme.colors.text.secondary} /> : <Sun size={16} color={theme.colors.text.secondary} />}
                            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            thumbColor="#FFF"
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                    </View>

                    <TouchableOpacity style={styles.row} onPress={handleSignOut}>
                        <View style={styles.iconRow}>
                            <LogOut size={16} color={theme.colors.status.error} />
                            <Text style={[styles.label, { color: theme.colors.status.error }]}>Sign Out</Text>
                        </View>
                    </TouchableOpacity>
                </Card>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    popup: {
        position: 'absolute',
        width: 270,
        padding: 18,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
    },
    role: {
        fontSize: 11,
    },
    divider: {
        height: 1,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
    }
});
