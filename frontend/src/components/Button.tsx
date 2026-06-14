import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    style,
    icon,
}) => {
    const { theme } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return theme.colors.border;
        switch (variant) {
            case 'primary': return 'transparent';
            case 'secondary': return theme.colors.surfaceRaised;
            case 'outline': return 'transparent';
            case 'danger': return `${theme.colors.status.error}12`;
            default: return theme.colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.colors.text.muted;
        switch (variant) {
            case 'primary': return theme.colors.text.inverse;
            case 'secondary': return theme.colors.text.primary;
            case 'outline': return theme.colors.primary;
            case 'danger': return theme.colors.status.error;
            default: return theme.colors.text.primary;
        }
    };

    const getBorderColor = () => {
        if (variant === 'outline') return theme.colors.primary;
        if (variant === 'secondary') return theme.colors.border;
        if (variant === 'danger') return `${theme.colors.status.error}55`;
        return 'transparent';
    };

    const fillStyle = size === 'lg' ? styles.fillLg : size === 'sm' ? styles.fillSm : styles.fillMd;

    const content = isLoading ? (
        <ActivityIndicator color={getTextColor()} />
    ) : (
        <>
            {icon}
            <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
        </>
    );

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={title}
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' || variant === 'secondary' || variant === 'danger' ? 1 : 0,
                    borderRadius: theme.borderRadius.md,
                    overflow: 'hidden',
                    opacity: disabled ? 0.62 : 1,
                },
                style,
                icon ? { flexDirection: 'row', gap: theme.spacing.sm } : null
            ]}
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
        >
            {variant === 'primary' && !disabled ? (
                <LinearGradient
                    colors={[theme.colors.primaryStrong, theme.colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradientFill, fillStyle]}
                >
                    {content}
                </LinearGradient>
            ) : (
                <View style={[styles.plainFill, fillStyle]}>{content}</View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 0,
        marginVertical: 3,
    },
    gradientFill: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        width: '100%',
    },
    plainFill: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        width: '100%',
    },
    fillSm: {
        minHeight: 40,
        paddingHorizontal: 14,
    },
    fillMd: {
        minHeight: 48,
        paddingHorizontal: 18,
    },
    fillLg: {
        minHeight: 54,
        paddingHorizontal: 22,
    },
    text: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0,
    },
});
