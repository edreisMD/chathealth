import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import Animated from "react-native-reanimated";

export const AwaitingAgentResponseIndicator = () => {
  const fadeValue = useSharedValue(0);
  const pulseOpacity = useSharedValue(1.0);

  useEffect(() => {
    // Start the pulsing animation
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1000 }),
        withTiming(0.6, { duration: 1000 }),
      ),
      -1,
      true,
    );

    // Start with transparent indicator, then fade in after delay
    const timeout = setTimeout(() => {
      // Fade in animation
      fadeValue.value = withTiming(1, { duration: 300 });

      // Trigger haptic feedback when indicator becomes visible
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Silent error handling for haptic feedback
      });
    }, 800);

    return () => clearTimeout(timeout);
  }, []);

  // Combine fade-in and pulsing animations
  const combinedAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeValue.value * pulseOpacity.value,
    };
  });

  return (
    <View className="py-2 items-start">
      <View className="mb-6">
        <View className="flex-row justify-start">
          <View className="relative flex h-5 w-5">
            <Animated.View
              style={combinedAnimatedStyle}
              className="absolute inline-flex h-full w-full rounded-full bg-black"
            />
          </View>
        </View>
      </View>
    </View>
  );
};
