// Custom haptics wrapper to handle expo-haptics imports safely
import { Platform } from "react-native";

let Haptics: any = null;

// Dynamically import expo-haptics to avoid TypeScript stripping issues
try {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    Haptics = require("expo-haptics");
  }
} catch (error) {
  console.log("expo-haptics not available:");
}

export const ImpactFeedbackStyle = {
  Light: "light",
  Medium: "medium",
  Heavy: "heavy",
} as const;

export const impactAsync = async (style: keyof typeof ImpactFeedbackStyle) => {
  try {
    if (Haptics && Haptics.impactAsync) {
      const hapticStyle =
        style === "Light"
          ? Haptics.ImpactFeedbackStyle.Light
          : style === "Medium"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Heavy;

      await Haptics.impactAsync(hapticStyle);
    } else {
      console.log("Haptics not available, skipping feedback");
    }
  } catch (error) {
    console.log("Haptic feedback failed:");
  }
};

export const notificationAsync = async (
  type: "success" | "warning" | "error",
) => {
  try {
    if (Haptics && Haptics.notificationAsync) {
      const notificationType =
        type === "success"
          ? Haptics.NotificationFeedbackType.Success
          : type === "warning"
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Error;

      await Haptics.notificationAsync(notificationType);
    } else {
      console.log("Haptics not available, skipping notification feedback");
    }
  } catch (error) {
    console.log("Haptic notification failed:");
  }
};

export const selectionAsync = async () => {
  try {
    if (Haptics && Haptics.selectionAsync) {
      await Haptics.selectionAsync();
    } else {
      console.log("Haptics not available, skipping selection feedback");
    }
  } catch (error) {
    console.log("Haptic selection failed:");
  }
};
