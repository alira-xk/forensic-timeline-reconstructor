import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../theme/ThemeContext';

type DynamicBackdropProps = {
  intensity?: 'quiet' | 'cinematic';
};

export const DynamicBackdrop: React.FC<DynamicBackdropProps> = ({ intensity = 'quiet' }) => {
  const { theme } = useTheme();
  const drift = useRef(new Animated.Value(0)).current;
  const stronger = intensity === 'cinematic';

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 11000,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 11000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [drift]);

  const translateA = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 16],
  });

  const translateB = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -14],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          theme.colors.backdrop.base,
          theme.dark ? '#0E1622' : '#EDF4FF',
          theme.colors.backdrop.base,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.sheen,
          styles.sheenTop,
          {
            opacity: stronger ? 0.78 : 0.42,
            transform: [{ translateX: translateA }, { translateY: translateB }, { rotate: '-9deg' }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', theme.colors.backdrop.glowA, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheen,
          styles.sheenBottom,
          {
            opacity: stronger ? 0.64 : 0.34,
            transform: [{ translateX: translateB }, { translateY: translateA }, { rotate: '8deg' }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', theme.colors.backdrop.glowB, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={[styles.grid, { borderColor: theme.colors.backdrop.grid }]} />
      <View style={[styles.grid, styles.gridOffset, { borderColor: theme.colors.backdrop.grid }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  sheen: {
    position: 'absolute',
    height: 170,
    left: '-12%',
    right: '-12%',
    overflow: 'hidden',
  },
  sheenTop: {
    top: -52,
  },
  sheenBottom: {
    bottom: 42,
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    opacity: 0.22,
    transform: [{ rotate: '-12deg' }, { scale: 1.2 }],
  },
  gridOffset: {
    opacity: 0.12,
    transform: [{ rotate: '12deg' }, { scale: 1.16 }],
  },
});
