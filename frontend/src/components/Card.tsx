import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, glass = false }) => {
    const { theme } = useTheme();

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: glass ? theme.colors.surface : (theme.dark ? '#1e293b' : '#ffffff'),
                borderColor: glass ? 'rgba(255,255,255,0.1)' : theme.colors.border,
                borderWidth: glass ? 1 : styles.container.borderWidth,
                ...theme.shadows.card
            },
            style
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
});
