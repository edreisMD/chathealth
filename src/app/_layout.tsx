import { Stack, useRouter } from "expo-router";
import React, { useCallback, useState, useEffect } from "react";
import { AuthProvider } from "@/contexts/auth";
import { SplashScreenController } from "@/components/splash-screen-controller";
import { notificationService } from "@/lib/notifications";
import MoodNotificationService from "@/services/moodNotificationService";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  SafeAreaProvider,
  initialWindowMetrics,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth";
import "@/lib/polyfills";
import "../../globals.css";
import * as SplashScreen from "expo-splash-screen";
import { sendPushTokenToBackend } from "@/lib/api";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function Root() {
  // Track when the root view has performed its first layout
  const [rootViewReady, setRootViewReady] = useState(false);

  const onLayoutRootView = useCallback(() => {
    setRootViewReady(true);
  }, []);

  // Set up the auth context and render layout inside of it
  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <KeyboardProvider statusBarTranslucent={false}>
          <SafeAreaView className="flex-1 bg-gray-100">
            <AuthProvider>
              <SplashScreenController rootViewReady={rootViewReady} />
              <RootNavigator />
            </AuthProvider>
          </SafeAreaView>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Separate this into a new component so it can access the AuthProvider context
function RootNavigator() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [hasInitialRouted, setHasInitialRouted] = useState(false);

  // Initialize notifications when app starts
  useEffect(() => {
    async function initializeNotifications() {
      try {
        console.log("Initializing notifications...");

        // Set up notification listeners
        notificationService.setupNotificationListeners();

        // Initialize mood tracking notifications
        const moodService = MoodNotificationService.getInstance();
        await moodService.initialize();

        // Register for push notifications
        const token =
          await notificationService.registerForPushNotificationsAsync();
        if (token) {
          console.log("Push notification token obtained:");

          // Send token to backend
          try {
            await sendPushTokenToBackend(token);
            console.log("Push token sent to backend successfully");
          } catch (error) {
            console.error("Failed to send push token to backend:");
          }
        } else {
          console.log("Failed to get push notification token");
        }
      } catch (error) {
        console.error("Error initializing notifications:");
      }
    }

    initializeNotifications();
  }, []);

  // Handle initial routing based on app state
  useEffect(() => {
    if (isSignedIn && !hasInitialRouted) {
      handleInitialRouting();
      setHasInitialRouted(true);
    }
  }, [isSignedIn, hasInitialRouted]);

  const handleInitialRouting = async () => {
    try {
      // Always go to chat screen (home)
      router.replace("/");
    } catch (error) {
      console.error("[RootNavigator] Failed to handle initial routing:");
      // Default to chat on error
      router.replace("/");
    }
  };

  return (
    <Stack
      screenOptions={{
        animation: "fade",
        animationDuration: 50,
        headerShown: false,
      }}
    >
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="checkin" />
        <Stack.Screen name="chat/[chatId]" />
        <Stack.Screen
          name="sidebar"
          options={{ animation: "slide_from_left", animationDuration: 250 }}
        />
        <Stack.Screen name="labs" />
        <Stack.Screen name="prevention" />
        <Stack.Screen name="lifestyle" />
        <Stack.Screen name="consultations" />
        <Stack.Screen name="settings" />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
