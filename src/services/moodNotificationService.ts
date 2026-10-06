import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Mood levels matching the UI design
export enum MoodLevel {
  AWFUL = 1,
  BAD = 2,
  OKAY = 3,
  GOOD = 4,
  GREAT = 5,
}

export interface MoodEntry {
  id: string;
  level: MoodLevel;
  timestamp: Date;
  source: "notification" | "manual";
}

// Storage keys
const MOOD_DATA_KEY = "mood_tracking_data";
const MOOD_SETTINGS_KEY = "mood_notification_settings";
const LAST_MOOD_PROMPT_KEY = "last_mood_prompt";

// Notification settings
interface MoodNotificationSettings {
  enabled: boolean;
  frequency: "daily" | "twice_daily" | "three_times_daily";
  times: string[]; // Array of times like ['09:00', '15:00', '21:00']
  lastPrompt?: Date;
}

class MoodNotificationService {
  private static instance: MoodNotificationService;

  public static getInstance(): MoodNotificationService {
    if (!MoodNotificationService.instance) {
      MoodNotificationService.instance = new MoodNotificationService();
    }
    return MoodNotificationService.instance;
  }

  // Initialize mood tracking notifications
  async initialize(): Promise<void> {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Set up notification categories with actions
      await this.setupNotificationCategories();

      // Schedule initial notifications if enabled
      const settings = await this.getSettings();
      if (settings.enabled) {
        await this.scheduleNotifications();
      }

      console.log("[MoodNotification] Service initialized");
    } catch (error) {
      console.error("[MoodNotification] Initialization error:");
    }
  }

  // Set up notification categories with mood selection actions
  private async setupNotificationCategories(): Promise<void> {
    try {
      if (Platform.OS === "ios") {
        await Notifications.setNotificationCategoryAsync("mood-check", [
          {
            identifier: "mood-awful",
            buttonTitle: "😞 Awful",
            options: {
              opensAppToForeground: false,
            },
          },
          {
            identifier: "mood-bad",
            buttonTitle: "😕 Bad",
            options: {
              opensAppToForeground: false,
            },
          },
          {
            identifier: "mood-okay",
            buttonTitle: "😐 Okay",
            options: {
              opensAppToForeground: false,
            },
          },
          {
            identifier: "mood-good",
            buttonTitle: "🙂 Good",
            options: {
              opensAppToForeground: false,
            },
          },
          {
            identifier: "mood-great",
            buttonTitle: "😊 Great",
            options: {
              opensAppToForeground: false,
            },
          },
        ]);
      }

      console.log("[MoodNotification] Categories configured");
    } catch (error) {
      console.error("[MoodNotification] Category setup error:");
    }
  }

  // Enable mood tracking with settings
  async enableMoodTracking(
    settings: Partial<MoodNotificationSettings>,
  ): Promise<void> {
    try {
      const defaultSettings: MoodNotificationSettings = {
        enabled: true,
        frequency: "twice_daily",
        times: ["09:00", "21:00"], // Morning and evening
      };

      const finalSettings = { ...defaultSettings, ...settings };
      await AsyncStorage.setItem(
        MOOD_SETTINGS_KEY,
        JSON.stringify(finalSettings),
      );

      await this.scheduleNotifications();
      console.log("[MoodNotification] Enabled with settings:");
    } catch (error) {
      console.error("[MoodNotification] Enable error:");
    }
  }

  // Disable mood tracking
  async disableMoodTracking(): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.enabled = false;
      await AsyncStorage.setItem(MOOD_SETTINGS_KEY, JSON.stringify(settings));

      await this.cancelAllNotifications();
      console.log("[MoodNotification] Disabled");
    } catch (error) {
      console.error("[MoodNotification] Disable error:");
    }
  }

  // Get current settings
  async getSettings(): Promise<MoodNotificationSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(MOOD_SETTINGS_KEY);
      if (settingsJson) {
        return JSON.parse(settingsJson);
      }

      // Default settings
      return {
        enabled: false,
        frequency: "twice_daily",
        times: ["09:00", "21:00"],
      };
    } catch (error) {
      console.error("[MoodNotification] Get settings error:");
      return {
        enabled: false,
        frequency: "twice_daily",
        times: ["09:00", "21:00"],
      };
    }
  }

  // Schedule mood notification reminders
  private async scheduleNotifications(): Promise<void> {
    try {
      // Cancel existing notifications first
      await this.cancelAllNotifications();

      const settings = await this.getSettings();
      if (!settings.enabled) return;

      // Schedule notifications for each time
      for (const time of settings.times) {
        const [hour, minute] = time.split(":").map(Number);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "How are you feeling?",
            body: "Take a moment to check in with your mood 💭",
            categoryIdentifier:
              Platform.OS === "ios" ? "mood-check" : undefined,
            data: {
              type: "mood-check",
              timestamp: new Date().toISOString(),
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour,
            minute,
            repeats: true,
          },
        });
      }

      console.log("[MoodNotification] Scheduled notifications for:");
    } catch (error) {
      console.error("[MoodNotification] Schedule error:");
    }
  }

  // Cancel all mood notifications
  private async cancelAllNotifications(): Promise<void> {
    try {
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();
      const moodNotifications = scheduledNotifications.filter(
        (notification) => notification.content.data?.type === "mood-check",
      );

      for (const notification of moodNotifications) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        );
      }

      console.log("ChatHealth: operation status");
    } catch (error) {
      console.error("[MoodNotification] Cancel notifications error:");
    }
  }

  // Record mood entry from notification action
  async recordMoodFromNotification(actionIdentifier: string): Promise<void> {
    try {
      let moodLevel: MoodLevel;

      switch (actionIdentifier) {
        case "mood-awful":
          moodLevel = MoodLevel.AWFUL;
          break;
        case "mood-bad":
          moodLevel = MoodLevel.BAD;
          break;
        case "mood-okay":
          moodLevel = MoodLevel.OKAY;
          break;
        case "mood-good":
          moodLevel = MoodLevel.GOOD;
          break;
        case "mood-great":
          moodLevel = MoodLevel.GREAT;
          break;
        default:
          console.warn("[MoodNotification] Unknown action:");
          return;
      }

      await this.recordMoodEntry(moodLevel, "notification");

      // Update last prompt time
      await AsyncStorage.setItem(
        LAST_MOOD_PROMPT_KEY,
        new Date().toISOString(),
      );

      console.log("[MoodNotification] Mood recorded:");
    } catch (error) {
      console.error("[MoodNotification] Record mood error:");
    }
  }

  // Record mood entry manually
  async recordMoodEntry(
    level: MoodLevel,
    source: "notification" | "manual" = "manual",
  ): Promise<void> {
    try {
      const entry: MoodEntry = {
        id: `mood_${Date.now()}`,
        level,
        timestamp: new Date(),
        source,
      };

      // Get existing mood data
      const existingData = await this.getMoodData();
      existingData.push(entry);

      // Keep only last 90 days of data
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const filteredData = existingData.filter(
        (entry) => new Date(entry.timestamp) > ninetyDaysAgo,
      );

      await AsyncStorage.setItem(MOOD_DATA_KEY, JSON.stringify(filteredData));
      console.log("[MoodNotification] Mood entry saved:");
    } catch (error) {
      console.error("[MoodNotification] Save mood entry error:");
    }
  }

  // Get all mood data
  async getMoodData(): Promise<MoodEntry[]> {
    try {
      const dataJson = await AsyncStorage.getItem(MOOD_DATA_KEY);
      if (dataJson) {
        const data = JSON.parse(dataJson);
        // Convert timestamp strings back to Date objects
        return data.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
      }
      return [];
    } catch (error) {
      console.error("[MoodNotification] Get mood data error:");
      return [];
    }
  }

  // Calculate mood score for dashboard (0-100)
  async calculateMoodScore(): Promise<{
    score: number;
    label: string;
    status: string;
  }> {
    try {
      const moodData = await this.getMoodData();

      if (moodData.length === 0) {
        return { score: 0, label: "No Data", status: "no-data" };
      }

      // Get recent mood data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentMoods = moodData.filter(
        (entry) => entry.timestamp > sevenDaysAgo,
      );

      if (recentMoods.length === 0) {
        return { score: 0, label: "No Recent Data", status: "no-data" };
      }

      // Calculate average mood (1-5 scale)
      const averageMood =
        recentMoods.reduce((sum, entry) => sum + entry.level, 0) /
        recentMoods.length;

      // Convert to 0-100 scale
      const score = Math.round(((averageMood - 1) / 4) * 100);

      let label = "Poor";
      let status = "poor";

      if (score >= 85) {
        label = "Excellent";
        status = "excellent";
      } else if (score >= 70) {
        label = "Good";
        status = "good";
      } else if (score >= 50) {
        label = "Fair";
        status = "fair";
      }

      return { score, label, status };
    } catch (error) {
      console.error("[MoodNotification] Calculate score error:");
      return { score: 0, label: "Error", status: "no-data" };
    }
  }

  // Get mood trend (last 7 days)
  async getMoodTrend(): Promise<{ date: string; mood: number }[]> {
    try {
      const moodData = await this.getMoodData();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentMoods = moodData.filter(
        (entry) => entry.timestamp > sevenDaysAgo,
      );

      // Group by date and calculate daily average
      const dailyMoods: { [date: string]: number[] } = {};

      recentMoods.forEach((entry) => {
        const dateKey = entry.timestamp.toISOString().split("T")[0];
        if (!dailyMoods[dateKey]) {
          dailyMoods[dateKey] = [];
        }
        dailyMoods[dateKey].push(entry.level);
      });

      // Calculate daily averages
      const trend = Object.entries(dailyMoods).map(([date, moods]) => ({
        date,
        mood: moods.reduce((sum, mood) => sum + mood, 0) / moods.length,
      }));

      return trend.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error("[MoodNotification] Get trend error:");
      return [];
    }
  }
}

export default MoodNotificationService;
