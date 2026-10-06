import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SCREEN_KEY = "last_accessed_screen";
const APP_LAUNCH_COUNT_KEY = "app_launch_count";

type AppScreen =
  | "chat"
  | "checkin"
  | "labs"
  | "prevention"
  | "lifestyle"
  | "consultations";

interface AppState {
  lastScreen: AppScreen;
  isFirstLaunch: boolean;
  launchCount: number;
}

export function useAppState() {
  const [appState, setAppState] = useState<AppState>({
    lastScreen: "chat",
    isFirstLaunch: true,
    launchCount: 0,
  });

  // Load app state on mount
  useEffect(() => {
    loadAppState();
  }, []);

  const loadAppState = async () => {
    try {
      const [lastScreen, launchCountStr] = await Promise.all([
        AsyncStorage.getItem(LAST_SCREEN_KEY),
        AsyncStorage.getItem(APP_LAUNCH_COUNT_KEY),
      ]);

      const launchCount = launchCountStr ? parseInt(launchCountStr, 10) : 0;
      const newLaunchCount = launchCount + 1;

      // Update launch count
      await AsyncStorage.setItem(
        APP_LAUNCH_COUNT_KEY,
        newLaunchCount.toString(),
      );

      setAppState({
        lastScreen: (lastScreen as AppScreen) || "chat",
        isFirstLaunch: launchCount === 0,
        launchCount: newLaunchCount,
      });
    } catch (error) {
      console.error("[AppState] Failed to load app state:");
      // Default to chat on error
      setAppState({
        lastScreen: "chat",
        isFirstLaunch: true,
        launchCount: 1,
      });
    }
  };

  const setLastScreen = async (screen: AppScreen) => {
    try {
      await AsyncStorage.setItem(LAST_SCREEN_KEY, screen);
      setAppState((prev) => ({ ...prev, lastScreen: screen }));
    } catch (error) {
      console.error("[AppState] Failed to save last screen:");
    }
  };

  /**
   * Determines which screen to show based on app launch and last accessed screen
   * Rules:
   * 1. All launches -> Chat (home screen)
   */
  const getInitialScreen = (): AppScreen => {
    // Always go to chat since it's the home screen
    return "chat";
  };

  return {
    appState,
    setLastScreen,
    getInitialScreen,
  };
}

// Export the key for use in individual screens
export { LAST_SCREEN_KEY };
