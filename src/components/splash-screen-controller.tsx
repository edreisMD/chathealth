import { useEffect, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "@/contexts/auth";

export function SplashScreenController({
  rootViewReady,
}: {
  rootViewReady: boolean;
}) {
  const { isLoading } = useAuth();
  const splashStartTime = useRef(Date.now());
  const hasHiddenSplash = useRef(false);

  useEffect(() => {
    async function hideSplash() {
      try {
        // Skip if already hidden
        if (hasHiddenSplash.current) return;

        // Enforce ≥1 s splash duration
        const elapsedTime = Date.now() - splashStartTime.current;
        const minDisplayTime = 1000;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

        // Wait out remaining time, if any
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        // Hide splash
        await SplashScreen.hideAsync();
        hasHiddenSplash.current = true;
      } catch (error) {
        console.warn("Error hiding splash screen:");
      }
    }

    // Trigger hide when auth is ready and root view is laid out
    if (!isLoading && rootViewReady) {
      hideSplash();
    }
  }, [isLoading, rootViewReady]);

  return null;
}
