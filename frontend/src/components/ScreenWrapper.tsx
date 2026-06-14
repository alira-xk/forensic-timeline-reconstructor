import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform, useWindowDimensions, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Sidebar } from './Sidebar';
import { DynamicBackdrop } from './DynamicBackdrop';
import { ScreenReveal } from './ScreenReveal';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    withSafeArea?: boolean;
    fullWidth?: boolean;
    withSidebar?: boolean; // New prop to enable sidebar on authenticated screens
    backgroundTreatment?: 'none' | 'quiet' | 'cinematic';
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
    backgroundTreatment,
}) => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width > 768;
    const showSidebar = isWeb && withSidebar;

    const Container = withSafeArea && !showSidebar ? SafeAreaView : View;
    const backdropIntensity = backgroundTreatment || (withSidebar ? 'quiet' : 'cinematic');

    return (
        <View style={[styles.mainLayout, { backgroundColor: theme.colors.background }]}>
            {backdropIntensity !== 'none' ? <DynamicBackdrop intensity={backdropIntensity} /> : null}
            <StatusBar
                barStyle={theme.dark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            {/* Sidebar - Only renders on Web if enabled */}
            {showSidebar && <Sidebar />}

            <Container style={[styles.container]}>
                <View style={[
                    styles.webCentering,
                    showSidebar && styles.webWithSidebar
                ]}>
                    <ScreenReveal style={[
                        styles.contentContainer,
                        { maxWidth: isWeb && !fullWidth ? CONTENT_MAX_WIDTH : '100%' },
                        style
                    ]}>
                        {children}
                    </ScreenReveal>
                </View>
            </Container>
        </View>
    );
};

const styles = StyleSheet.create({
    mainLayout: {
        flex: 1,
        flexDirection: 'row', // Allows Sidebar + Content side-by-side
        overflow: 'hidden',
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
        alignItems: 'center',
        paddingHorizontal: 0,
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        alignSelf: 'center', // Centers itself within the parent wrapper
    },
});
