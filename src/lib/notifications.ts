import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Device from "expo-device";
import { router } from "expo-router";
import MoodNotificationService from "@/services/moodNotificationService";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type?: string;
  checkinId?: string;
  chatId?: string;
  agentType?: string;
  action?: string;
  [key: string]: any;
}

class NotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications
  async registerForPushNotificationsAsync(): Promise<string | null> {
    let token = null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return null;
      }

      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        if (!projectId) return null;
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log("Expo push token:");
        this.expoPushToken = token;
      } catch (error) {
        console.error("Error getting push token:");
      }
    } else {
      console.log("Must use physical device for Push Notifications");
    }

    return token;
  }

  // Get current push token
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // Handle notification tap (deep linking)
  setupNotificationListeners() {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:");
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log("Notification tapped:");

      const data = response.notification.request.content
        .data as NotificationData;
      const actionIdentifier = response.actionIdentifier;

      // Handle mood notification actions
      if (data.type === "mood-check" && actionIdentifier.startsWith("mood-")) {
        const moodService = MoodNotificationService.getInstance();
        await moodService.recordMoodFromNotification(actionIdentifier);
        console.log("Mood recorded from notification:");
        return;
      }

      this.handleNotificationTap(data);
    });
  }

  // Handle notification tap and navigate
  private handleNotificationTap(data: NotificationData) {
    console.log("Handling notification tap with data:");

    if (!data || !data.action) {
      console.log("No action data in notification");
      return;
    }

    switch (data.action) {
      case "open_checkins":
        router.push("/checkin");
        break;

      case "open_chat":
        if (data.chatId) {
          router.push(`/chat/${data.chatId}`);
        } else {
          router.push("/");
        }
        break;

      case "open_lifestyle":
        router.push("/lifestyle");
        break;

      default:
        console.log("Unknown notification action:");
        router.push("/");
    }
  }

  // Send local notification (for testing)
  async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: "default",
      },
      trigger: { seconds: 1 } as any,
    });
  }

  // Schedule a local notification for later
  async scheduleNotification(
    title: string,
    body: string,
    scheduledTime: Date,
    data?: NotificationData,
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: "default",
      },
      trigger: scheduledTime as any,
    });
  }
}

export const notificationService = new NotificationService();
