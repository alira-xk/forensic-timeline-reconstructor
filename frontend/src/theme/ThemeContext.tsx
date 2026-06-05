import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from './index';

type ThemeContextType = {
    theme: Theme;
    isDark: boolean;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme,
    isDark: false,
    toggleTheme: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [isDark, setIsDark] = useState(systemScheme === 'dark');

    useEffect(() => {
        AsyncStorage.getItem('forensic-theme').then((storedTheme) => {
            if (storedTheme === 'dark' || storedTheme === 'light') {
                setIsDark(storedTheme === 'dark');
            }
        }).catch(() => undefined);
    }, []);

    const toggleTheme = () => {
        setIsDark((current) => {
            const next = !current;
            AsyncStorage.setItem('forensic-theme', next ? 'dark' : 'light').catch(() => undefined);
            return next;
        });
    };

    const theme = isDark ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
