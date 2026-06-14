import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

type AnimatedPressableProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressedScale = 0.985,
  style,
  ...props
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      damping: 20,
      mass: 0.5,
      stiffness: 280,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          animateTo(pressedScale);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateTo(1);
          onPressOut?.(event);
        }}
        style={({ pressed }) => [
          style,
          pressed && !disabled ? { opacity: 0.9 } : null,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
