import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                    {label}
                </Text>
            )}
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text.primary,
                        borderColor: error ? theme.colors.status.error : theme.colors.border,
                    },
                    style,
                ]}
                placeholderTextColor={theme.colors.text.muted}
                selectionColor={theme.colors.primary}
                {...props}
            />
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
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        fontSize: 14,
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
    },
});
