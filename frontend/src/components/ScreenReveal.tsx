import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleProp, ViewStyle } from 'react-native';

type ScreenRevealProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const ScreenReveal: React.FC<ScreenRevealProps> = ({ children, style }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }

    Animated.timing(progress, {
      toValue: 1,
      duration: 360,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
