import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
    const { theme } = useTheme();

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
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
        borderRadius: 8, // Using numeric value assuming theme is not available in static style
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
});
