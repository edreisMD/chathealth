import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { View } from "react-native";

const PADDING_BOTTOM = 0;

export const useGradualAnimation = () => {
  const height = useSharedValue(PADDING_BOTTOM);

  useKeyboardHandler({
    onMove: (e) => {
      "worklet";
      height.value = Math.max(e.height + PADDING_BOTTOM, PADDING_BOTTOM);
    },
  });

  return { height };
};

export const useKeyboardSpacer = (height: any, safeAreaBottom: number) => {
  const keyboardSpacer = useAnimatedStyle(() => {
    // Subtract safe-area bottom inset so TextInput sits right on top of the keyboard
    const adjustedHeight = Math.max(Math.abs(height.value) - safeAreaBottom, 0);

    return {
      height: adjustedHeight,
    };
  }, [safeAreaBottom]);

  return { keyboardSpacer };
};

export const useAwaitingResponseAnimation = () => {
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 600 }),
        withTiming(0.3, { duration: 600 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { animatedStyle };
};

export const KeyboardSpacer = () => {
  // Retrieve safe-area inset internally.
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  const { height } = useGradualAnimation();
  const { keyboardSpacer } = useKeyboardSpacer(height, safeAreaBottom);

  return <Animated.View style={keyboardSpacer} />;
};
