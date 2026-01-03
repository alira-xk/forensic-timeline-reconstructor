import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Upload, Cpu, FileText, CheckCircle, ChevronLeft } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

type Props = NativeStackScreenProps<RootStackParamList, 'CaseDetail'>;

export const CaseDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { caseId } = route.params;
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width > 768;

    const [extracting, setExtracting] = useState(false);
    const [files, setFiles] = useState<any[]>([]);

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({});
            if (!result.canceled) {
                setFiles(prev => [...prev, result.assets[0]]);
            }
        } catch (e) {
            console.log('Pick cancelled or failed');
        }
    };

    const handleExtraction = () => {
        setExtracting(true);
        setTimeout(() => {
            setExtracting(false);
            alert('Extraction Complete! Timeline Updated.');
        }, 2000);
    };

    const renderContent = () => (
        <>
            {/* Case Metadata */}
            <Card style={styles.metaCard}>
                <View style={styles.metaRow}>
                    <View>
                        <Text style={[styles.metaLabel, { color: theme.colors.text.secondary }]}>STATUS</Text>
                        <Text style={[styles.metaValueActive, { color: theme.colors.status.success }]}>Active Investigation</Text>
                    </View>
                    <View style={[styles.verticalDivider, { backgroundColor: theme.colors.border }]} />
                    <View>
                        <Text style={[styles.metaLabel, { color: theme.colors.text.secondary }]}>CREATED</Text>
                        <Text style={[styles.metaValue, { color: theme.colors.text.primary }]}>2023-10-24</Text>
                    </View>
                    <View style={[styles.verticalDivider, { backgroundColor: theme.colors.border }]} />
                    <View>
                        <Text style={[styles.metaLabel, { color: theme.colors.text.secondary }]}>ASSIGNED AGENT</Text>
                        <Text style={[styles.metaValue, { color: theme.colors.text.primary }]}>Ali</Text>
                    </View>
                </View>
            </Card>

            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>CHAIN OF CUSTODY</Text>

            {files.length > 0 ? (
                <View style={styles.filesList}>
                    {files.map((f, i) => (
                        <Card key={i} style={styles.fileItem}>
                            <FileText color={theme.colors.text.secondary} size={20} />
                            <Text style={[styles.fileName, { color: theme.colors.text.primary }]} numberOfLines={1}>{f.name}</Text>
                            <View style={styles.verifiedBadge}>
                                <CheckCircle color={theme.colors.status.success} size={14} />
                                <Text style={styles.verifiedText}>VERIFIED</Text>
                            </View>
                        </Card>
                    ))}
                </View>
            ) : (
                <Card style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: theme.colors.text.muted }]}>No evidence files currently active.</Text>
                </Card>
            )}
        </>
    );

    const renderActions = () => (
        <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>EVIDENCE ACQUISITION</Text>

            <View style={[styles.actionRow, isWeb && styles.actionRowWeb]}>
                <Button
                    title="Upload Disk Image"
                    onPress={handleUpload}
                    variant="outline"
                    style={isWeb ? styles.actionButtonWeb : { flex: 1 }}
                    icon={<Upload size={18} color={theme.colors.primary} />}
                />
                <Button
                    title="Start Extraction"
                    onPress={handleExtraction}
                    variant="primary"
                    style={isWeb ? styles.actionButtonWeb : { flex: 1 }}
                    isLoading={extracting}
                    icon={<Cpu size={18} color={theme.colors.text.inverse} />}
                />
            </View>
        </>
    );

    return (
        <ScreenWrapper fullWidth={isWeb}>
            <View style={[styles.header, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <Button
                    title="Back"
                    variant="outline"
                    icon={<ChevronLeft size={16} color={theme.colors.primary} />}
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                />
                <View>
                    <Text style={[styles.headerLabel, { color: theme.colors.text.secondary }]}>INVESTIGATION</Text>
                    <Text style={[styles.title, { color: theme.colors.text.primary }]}>CASE #{caseId}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {isWeb ? (
                    <View style={styles.webContainer}>
                        <View style={styles.webLeft}>{renderContent()}</View>
                        <View style={styles.webRight}>{renderActions()}</View>
                    </View>
                ) : (
                    <>
                        {renderContent()}
                        {renderActions()}
                    </>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 24,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 90,
        height: 36,
        paddingHorizontal: 0,
        marginVertical: 0
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        padding: 24,
    },
    metaCard: {
        marginBottom: 32,
        padding: 24,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verticalDivider: {
        width: 1,
        height: 24,
        marginHorizontal: 24,
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    metaValueActive: {
        fontSize: 14,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 16,
        marginTop: 16,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    actionRowWeb: {
        flexDirection: 'row', // Keep row on web, don't stack
        justifyContent: 'flex-start', // Align left
        flexWrap: 'wrap',
    },
    actionButtonWeb: {
        width: 'auto', // Allow content width
        minWidth: 160,
        paddingHorizontal: 24,
    },
    filesList: {
        marginBottom: 24,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        marginBottom: 8,
    },
    fileName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    verifiedText: {
        color: '#16A34A',
        fontSize: 10,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
    },
    emptyText: {
    },
    // Web Layout
    webContainer: {
        flexDirection: 'row',
        gap: 48,
    },
    webLeft: {
        flex: 3,
    },
    webRight: {
        flex: 2,
    }
});
