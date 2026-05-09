import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform, useWindowDimensions, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Sidebar } from './Sidebar';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    withSafeArea?: boolean;
    fullWidth?: boolean;
    withSidebar?: boolean; // New prop to enable sidebar on authenticated screens
}

// 1024 is the max width for CONTENT.
// But if we have a sidebar, the layout changes.
const CONTENT_MAX_WIDTH = 1024;

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    style,
    withSafeArea = true,
    fullWidth = false,
    withSidebar = false, // Default to false so Login doesn't get it automatically unless specified
}) => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width > 768;
    const showSidebar = isWeb && withSidebar;

    const Container = withSafeArea && !showSidebar ? SafeAreaView : View;

    return (
        <View style={[styles.mainLayout, { backgroundColor: theme.colors.background }]}>
            <StatusBar
                barStyle={theme.dark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            {/* Sidebar - Only renders on Web if enabled */}
            {showSidebar && <Sidebar />}

            <Container style={[styles.container]}>
                <View style={[
                    styles.webCentering,
                    // If sidebar is present, we don't center vertically the same way, we just let it flow
                    showSidebar && styles.webWithSidebar
                ]}>
                    <View style={[
                        styles.contentContainer,
                        // Logic: If on Web & NOT fullWidth & NO Sidebar -> constrain width (e.g. Login)
                        // If Sidebar is present -> let it fill the remaining space but maybe max out?
                        // Let's keep it simple: MaxWidth applies to the content block.
                        { maxWidth: isWeb && !fullWidth ? CONTENT_MAX_WIDTH : '100%' },
                        style
                    ]}>
                        {children}
                    </View>
                </View>
            </Container>
        </View>
    );
};

const styles = StyleSheet.create({
    mainLayout: {
        flex: 1,
        flexDirection: 'row', // Allows Sidebar + Content side-by-side
    },
    container: {
        flex: 1,
    },
    webCentering: {
        flex: 1,
        alignItems: 'center',
        width: '100%',
    },
    webWithSidebar: {
        alignItems: 'stretch', // Fill height/width when sidebar is there
        paddingHorizontal: 0,
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        alignSelf: 'center', // Centers itself within the parent wrapper
    },
});
