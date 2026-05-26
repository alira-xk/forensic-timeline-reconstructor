import React from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Require assets safely
const logoLight = require('../../assets/logo-light.png');
const logoDark = require('../../assets/logo-dark.png');

interface AppLogoProps {
    size?: number;
    style?: StyleProp<ImageStyle>;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 40, style }) => {
    const { isDark } = useTheme();

    return (
        <Image
            source={isDark ? logoDark : logoLight}
            style={[
                {
                    width: size,
                    height: size,
                    resizeMode: 'contain',
                    borderRadius: size * 0.2 // 20% of size for rounded corners
                },
                style
            ]}
        />
    );
};
