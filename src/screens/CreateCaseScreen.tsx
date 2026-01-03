import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ChevronLeft, Info, FolderPlus, ShieldCheck, Check } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCase'>;

export const CreateCaseScreen: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width > 900;

    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            navigation.goBack();
        }, 1000);
    };

    return (
        <ScreenWrapper>
            <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
                {/* Centered Shell */}
                <View style={styles.shell}>

                    {/* Header - Aligned with Content */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backLink}
                        >
                            <ChevronLeft size={16} color={theme.colors.text.secondary} />
                            <Text style={[styles.backText, { color: theme.colors.text.secondary }]}>Back to Cases</Text>
                        </TouchableOpacity>

                        <View style={styles.headerTitleRow}>
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary }]}>
                                <FolderPlus size={24} color="#FFF" />
                            </View>
                            <View>
                                <Text style={[styles.pageTitle, { color: theme.colors.text.primary }]}>Initialize New Case</Text>
                                <Text style={[styles.pageSubtitle, { color: theme.colors.text.secondary }]}>Digital Investigation & Evidence Gathering</Text>
                            </View>
                        </View>
                    </View>

                    {/* Content Split */}
                    <ScrollView contentContainerStyle={isWeb ? styles.webContentRow : styles.mobileContentCol}>

                        {/* Left Panel: Context (Web Only or Top on Mobile) */}
                        <View style={isWeb ? styles.leftPanel : styles.mobileInfoPanel}>
                            <Text style={[styles.sectionHeader, { color: theme.colors.text.primary }]}>New Investigation</Text>
                            <Text style={[styles.contextText, { color: theme.colors.text.secondary }]}>
                                Initializing a case creates a secure, immutable record in the timeline database.
                            </Text>

                            <View style={styles.infoList}>
                                <View style={styles.infoItem}>
                                    <ShieldCheck size={16} color={theme.colors.status.success} />
                                    <Text style={[styles.infoItemText, { color: theme.colors.text.secondary }]}>
                                        Unique Case ID generated automatically
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <ShieldCheck size={16} color={theme.colors.status.success} />
                                    <Text style={[styles.infoItemText, { color: theme.colors.text.secondary }]}>
                                        Chain of Custody log initiated
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Info size={16} color={theme.colors.status.info} />
                                    <Text style={[styles.infoItemText, { color: theme.colors.text.secondary }]}>
                                        Requires Administrator approval for deletion
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Right Panel: Form */}
                        <View style={isWeb ? styles.rightPanel : styles.mobileFormPanel}>
                            <Card style={[styles.formCard, { borderColor: theme.colors.border }]}>
                                <View style={[styles.formHeader, { borderBottomColor: theme.colors.border }]}>
                                    <Text style={[styles.formTitle, { color: theme.colors.text.primary }]}>Case Information</Text>
                                </View>

                                <View style={styles.formBody}>
                                    <Input
                                        label="OPERATION CODENAME"
                                        placeholder="e.g. Operation Blackout"
                                        value={name}
                                        onChangeText={setName}
                                        style={styles.inputSpacing}
                                    />
                                    <Input
                                        label="INCIDENT DESCRIPTION"
                                        placeholder="Brief details about the incident source and scope..."
                                        value={desc}
                                        onChangeText={setDesc}
                                        multiline
                                        numberOfLines={4}
                                        style={{ height: 120, textAlignVertical: 'top' }}
                                    />
                                </View>

                                <View style={[styles.formActions, { borderTopColor: theme.colors.border }]}>
                                    <Button
                                        title="Cancel"
                                        variant="outline"
                                        onPress={() => navigation.goBack()}
                                        style={styles.cancelBtn}
                                    />
                                    <Button
                                        title="Initialize & Save"
                                        onPress={handleCreate}
                                        isLoading={loading}
                                        variant="primary"
                                        style={styles.saveBtn}
                                        icon={<Check size={16} color={theme.colors.text.inverse} />}
                                    />
                                </View>
                            </Card>
                        </View>

                    </ScrollView>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        alignItems: 'center', // Center the shell
    },
    shell: {
        width: '100%',
        maxWidth: 1024,
        paddingHorizontal: 24,
        paddingTop: 32,
        flex: 1,
    },
    // Header
    header: {
        marginBottom: 32,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 4,
    },
    backText: {
        fontSize: 13,
        fontWeight: '500',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    pageSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },

    // Layout
    webContentRow: {
        flexDirection: 'row',
        gap: 48,
        alignItems: 'flex-start',
    },
    mobileContentCol: {
        flexDirection: 'column',
        gap: 24,
    },

    // Left Panel
    leftPanel: {
        width: 280,
        paddingTop: 8,
    },
    mobileInfoPanel: {
        marginBottom: 16,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    contextText: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 24,
    },
    infoList: {
        gap: 16,
    },
    infoItem: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    infoItemText: {
        fontSize: 13,
        lineHeight: 18,
        flex: 1,
    },

    // Right Panel
    rightPanel: {
        flex: 1,
    },
    mobileFormPanel: {
        flex: 1,
    },
    formCard: {
        padding: 0, // Reset default card padding for custom internal layout
        overflow: 'hidden',
    },
    formHeader: {
        padding: 24,
        borderBottomWidth: 1,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    formBody: {
        padding: 24,
    },
    inputSpacing: {
        marginBottom: 16,
    },
    formActions: {
        padding: 16,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.02)', // Subtle footer bg
    },
    cancelBtn: {
        width: 'auto',
        minWidth: 80,
    },
    saveBtn: {
        width: 'auto',
        minWidth: 140,
    },
});
