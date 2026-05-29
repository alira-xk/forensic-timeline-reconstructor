import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, secureTextEntry, ...props }) => {
    const { theme } = useTheme();
    const [passwordVisible, setPasswordVisible] = useState(false);
    const isPasswordInput = Boolean(secureTextEntry);
    const resolvedSecureTextEntry = isPasswordInput && !passwordVisible;

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                    {label}
                </Text>
            )}
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[
                        styles.input,
                        isPasswordInput && styles.passwordInput,
                        {
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.text.primary,
                            borderColor: error ? theme.colors.status.error : theme.colors.border,
                        },
                        style,
                    ]}
                    placeholderTextColor={theme.colors.text.muted}
                    selectionColor={theme.colors.primary}
                    secureTextEntry={resolvedSecureTextEntry}
                    {...props}
                />

                {isPasswordInput ? (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                        activeOpacity={0.75}
                        onPress={() => setPasswordVisible((visible) => !visible)}
                        style={styles.eyeButton}
                    >
                        {passwordVisible ? (
                            <EyeOff size={20} color={theme.colors.text.secondary} />
                        ) : (
                            <Eye size={20} color={theme.colors.text.secondary} />
                        )}
                    </TouchableOpacity>
                ) : null}
            </View>
            {error && (
                <Text style={[styles.errorText, { color: theme.colors.status.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: 0,
    },
    inputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderWidth: 1,
        fontSize: 14,
    },
    passwordInput: {
        paddingRight: 44,
    },
    eyeButton: {
        position: 'absolute',
        right: 10,
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
    },
});
