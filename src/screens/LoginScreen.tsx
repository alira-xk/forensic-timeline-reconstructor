import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Sun, Moon } from 'lucide-react-native';
import { AppLogo } from '../components/AppLogo';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, toggleTheme, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = () => {
        if (!email || !password) {
            Alert.alert('Authentication Error', 'Credential fields cannot be empty.');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            navigation.replace('Main');
        }, 1500);
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: theme.colors.background }]}>

            {/* Theme Toggle */}
            <TouchableOpacity
                onPress={toggleTheme}
                style={[styles.themeToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
                {isDark ? <Sun size={20} color={theme.colors.text.primary} /> : <Moon size={20} color={theme.colors.text.primary} />}
            </TouchableOpacity>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <AppLogo size={96} />
                        </View>
                        <Text style={[styles.title, { color: theme.colors.text.primary }]}>FORENSIC TIMELINE</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>RECONSTRUCTOR</Text>
                        <Text style={[styles.systemLabel, { color: theme.colors.text.muted }]}>Digital Evidence Analysis System</Text>
                    </View>

                    <View style={[styles.formCard, {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        shadowColor: theme.shadows.card.shadowColor
                    }]}>
                        <Text style={[styles.loginHeader, { color: theme.colors.text.primary }]}>Login</Text>

                        <Input
                            label="Email Address or ID"
                            placeholder="user.id@example.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                        <Input
                            label="Password"
                            placeholder="Enter password..."
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <TouchableOpacity style={styles.forgotPass}>
                            <Text style={[styles.forgotText, { color: theme.colors.primary }]}>Forgot password?</Text>
                        </TouchableOpacity>

                        <Button
                            title="LOGIN"
                            onPress={handleLogin}
                            isLoading={isLoading}
                            style={styles.button}
                        />

                        <View style={styles.dividerRow}>
                            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                            <Text style={[styles.dividerText, { color: theme.colors.text.muted }]}>OR</Text>
                            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                        </View>

                        <Button
                            title="Sign up"
                            variant="outline"
                            onPress={() => { }}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1, // Ensure it takes full height
    },
    themeToggle: {
        position: 'absolute',
        top: 40,
        right: 40,
        padding: 12,
        borderRadius: 999,
        borderWidth: 1,
        zIndex: 10,
    },
    keyboardView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 48, // Extract padding for bottom safe area
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
        width: '100%',
        maxWidth: 400,
    },
    logoContainer: {
        width: 96,
        height: 96,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 4, // Nudge logo slightly right as per user request
        marginBottom: 24,
        elevation: 4,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 1.5,
        textAlign: 'center',
        lineHeight: 28,
    },
    subtitle: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 1.5,
        lineHeight: 28,
    },
    systemLabel: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    formCard: {
        padding: 32,
        borderRadius: 16,
        borderWidth: 1,
        elevation: 2,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        width: '100%',
        maxWidth: 400,
    },
    button: {
        marginTop: 8,
    },
    forgotPass: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginTop: -8,
    },
    forgotText: {
        fontSize: 12,
        fontWeight: '600',
    },
    loginHeader: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 24,
        textAlign: 'center',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 11,
        fontWeight: '500',
    },
    socialRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
});
