import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

interface ThinkingIndicatorProps {
  text?: string;
  isAnimating?: boolean;
  isCompleted?: boolean;
}

export default function ThinkingIndicator({
  text = "Thinking",
  isAnimating = true,
  isCompleted = false,
}: ThinkingIndicatorProps) {
  const animationValue = useSharedValue(0);

  useEffect(() => {
    if (isAnimating && !isCompleted) {
      animationValue.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false,
      );
    } else {
      animationValue.value = 0;
    }
  }, [isAnimating, isCompleted]);

  // Animated gradient effect for the text
  const textGradientStyle = useAnimatedStyle(() => {
    if (isCompleted) {
      return {
        opacity: 0.7, // Dimmed when completed
      };
    }

    const opacity = interpolate(
      animationValue.value,
      [0, 0.5, 1],
      [0.7, 1, 0.7],
    );

    return {
      opacity,
    };
  });

  return (
    <View className="py-2 items-start">
      <View className="mb-2">
        <Animated.View style={textGradientStyle}>
          <Text className="text-gray-600 text-base">{text}</Text>
        </Animated.View>
      </View>
    </View>
  );
}
