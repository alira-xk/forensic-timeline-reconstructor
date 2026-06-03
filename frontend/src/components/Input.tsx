import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    TouchableOpacity,
    StyleProp,
    ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({ label, error, style, secureTextEntry, containerStyle, ...props }) => {
    const { theme } = useTheme();
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [focused, setFocused] = useState(false);
    const isPasswordInput = Boolean(secureTextEntry);
    const resolvedSecureTextEntry = isPasswordInput && !passwordVisible;

    return (
        <View style={[styles.container, containerStyle]}>
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
                            backgroundColor: theme.colors.surfaceRaised,
                            color: theme.colors.text.primary,
                            borderColor: error
                                ? theme.colors.status.error
                                : focused
                                    ? theme.colors.primary
                                    : theme.colors.border,
                        },
                        focused && theme.shadows.focus,
                        style,
                    ]}
                    placeholderTextColor={theme.colors.text.muted}
                    selectionColor={theme.colors.primary}
                    secureTextEntry={resolvedSecureTextEntry}
                    {...props}
                    onFocus={(event) => {
                        setFocused(true);
                        props.onFocus?.(event);
                    }}
                    onBlur={(event) => {
                        setFocused(false);
                        props.onBlur?.(event);
                    }}
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
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0,
    },
    inputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        minHeight: 48,
        borderRadius: 14,
        paddingHorizontal: 15,
        paddingVertical: 13,
        borderWidth: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    passwordInput: {
        paddingRight: 44,
    },
    eyeButton: {
        position: 'absolute',
        right: 9,
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
