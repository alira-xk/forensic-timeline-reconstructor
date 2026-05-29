import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    isLoading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    isLoading = false,
    disabled = false,
    style,
    icon,
}) => {
    const { theme } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return theme.colors.border;
        switch (variant) {
            case 'primary': return theme.colors.primary;
            case 'secondary': return theme.colors.surfaceHighlight;
            case 'outline': return 'transparent';
            case 'danger': return theme.colors.status.error;
            default: return theme.colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.colors.text.muted;
        switch (variant) {
            case 'primary': return theme.colors.text.inverse;
            case 'secondary': return theme.colors.text.primary;
            case 'outline': return theme.colors.primary;
            case 'danger': return theme.colors.text.inverse;
            default: return theme.colors.text.primary;
        }
    };

    const getBorderColor = () => {
        if (variant === 'outline') return theme.colors.primary;
        if (variant === 'secondary') return theme.colors.border;
        return 'transparent';
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
                    borderRadius: theme.borderRadius.md,
                },
                style,
                icon ? { flexDirection: 'row', gap: theme.spacing.sm } : null
            ]}
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
        >
            {isLoading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon}
                    <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 18,
        marginVertical: 3,
    },
    text: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0,
    },
});
