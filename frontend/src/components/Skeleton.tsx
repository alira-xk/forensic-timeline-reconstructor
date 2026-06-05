import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

type SkeletonProps = {
  height: number;
  width?: ViewStyle['width'];
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export const Skeleton: React.FC<SkeletonProps> = ({
  height,
  width = '100%',
  radius = 8,
  style,
}) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.surfaceHighlight,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <View style={styles.list}>
    {Array.from({ length: rows }).map((_, index) => (
      <View key={index} style={styles.row}>
        <Skeleton width={44} height={44} />
        <View style={styles.copy}>
          <Skeleton width="42%" height={14} />
          <Skeleton width="82%" height={11} style={styles.line} />
          <Skeleton width="55%" height={10} style={styles.line} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
  list: {
    gap: 12,
  },
  row: {
    minHeight: 82,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: 14,
  },
  line: {
    marginTop: 8,
  },
});
