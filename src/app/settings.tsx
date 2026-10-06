import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/contexts/auth";
import * as Haptics from "expo-haptics";
import {
  fetchNotifications,
  markNotificationsAsRead,
  authorizedFetch,
  getUserTimezone,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { notificationService } from "@/lib/notifications";
import { backgroundSyncService } from "@/services/backgroundSync";

// Apple Health integration check
let AppleHealthKit: any = null;
let isHealthKitAvailable = false;

if (Platform.OS === "ios") {
  try {
    AppleHealthKit = require("react-native-health");
    // Check if the module actually has the required methods
    if (AppleHealthKit && typeof AppleHealthKit.initHealthKit === "function") {
      isHealthKitAvailable = true;
    } else {
      console.log(
        "Apple Health module loaded but methods not available - likely needs native build",
      );
      AppleHealthKit = null;
    }
  } catch (error) {
    console.log("Apple Health not available:");
  }
}

interface SettingsItem {
  title: string;
  subtitle?: string;
  icon: string;
  type: "toggle" | "navigation" | "action" | "info";
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  rightText?: string;
  color?: string;
  disabled?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, session } = useAuth();
  const [healthConnected, setHealthConnected] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [agentsEnabled, setAgentsEnabled] = useState(true);

  // Background sync settings
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(true);
  const [backgroundSyncStatus, setBackgroundSyncStatus] = useState<{
    enabled: boolean;
    lastSync: Date | null;
    nextPeriodicSync: Date | null;
    configuredInterval: number;
  } | null>(null);

  // Agent timing settings
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);
  const [agentTimes, setAgentTimes] = useState({
    morning_motivator: "08:00",
    nutrition_guide_morning: "11:30",
    nutrition_guide_evening: "17:30",
    meal_tracker_breakfast: "09:30",
    meal_tracker_lunch: "13:30",
    meal_tracker_dinner: "19:30",
    health_analyst: "20:00",
  });

  // Ref for the time picker ScrollView
  const timePickerScrollRef = useRef<any>(null);

  useEffect(() => {
    checkHealthConnection();
    loadAgentTimes();
    loadBackgroundSyncStatus();
  }, []);

  // Load current agent times from database
  const loadAgentTimes = async () => {
    try {
      console.log("[SETTINGS] Loading agent times from database...");

      const response = await authorizedFetch("/api/health-agents");
      const result = await response.json();

      if (
        response.ok &&
        result.success &&
        result.schedules &&
        result.schedules.length > 0
      ) {
        console.log("[SETTINGS] Found existing agent schedules:");
        setAgentsEnabled(true);

        // Map database schedules to our state format
        const updatedTimes = { ...agentTimes };

        result.schedules.forEach((schedule: any) => {
          const agentType = schedule.agentType;
          const triggerCondition = schedule.triggerCondition;
          const triggerTime = schedule.triggerTime;

          // Map to our UI keys
          if (agentType === "morning_motivator") {
            updatedTimes.morning_motivator = triggerTime;
          } else if (agentType === "nutrition_guide") {
            if (triggerCondition === "before_meal") {
              updatedTimes.nutrition_guide_morning = triggerTime;
            } else if (triggerCondition === "before_dinner") {
              updatedTimes.nutrition_guide_evening = triggerTime;
            }
          } else if (agentType === "meal_tracker") {
            if (triggerCondition === "after_breakfast") {
              updatedTimes.meal_tracker_breakfast = triggerTime;
            } else if (triggerCondition === "after_lunch") {
              updatedTimes.meal_tracker_lunch = triggerTime;
            } else if (triggerCondition === "after_dinner") {
              updatedTimes.meal_tracker_dinner = triggerTime;
            }
          } else if (agentType === "health_analyst") {
            updatedTimes.health_analyst = triggerTime;
          }
        });

        setAgentTimes(updatedTimes);
        console.log("[SETTINGS] Updated agent times:");
      } else {
        // No agents found
        setAgentsEnabled(false);
        console.log("[SETTINGS] No agents found");
      }
    } catch (error) {
      console.error("[SETTINGS] Failed to load agent times:");
      setAgentsEnabled(false);
    }
  };

  // Effect to scroll to selected time when time picker opens
  useEffect(() => {
    if (showTimePicker) {
      const selectedTime =
        agentTimes[showTimePicker as keyof typeof agentTimes];
      const timeOptions = generateTimeOptions();
      scrollToSelectedTime(timePickerScrollRef, selectedTime, timeOptions);
    }
  }, [showTimePicker]);

  const checkHealthConnection = () => {
    if (Platform.OS === "ios" && isHealthKitAvailable && AppleHealthKit) {
      AppleHealthKit.isAvailable((error: any, available: boolean) => {
        if (!error && available) {
          // Check if we have permissions
          AppleHealthKit.getAuthStatus(
            {
              type: "Steps",
            },
            (error: any, status: any) => {
              setHealthConnected(!error && status === "authorized");
            },
          );
        }
      });
    }
  };

  const toggleHealthConnection = () => {
    if (healthConnected) {
      // Disconnect - show alert
      Alert.alert(
        "Disconnect Health Data",
        "This will stop syncing your health data. You can reconnect anytime in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: () => {
              setHealthConnected(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            },
          },
        ],
      );
    } else {
      // Connect to Apple Health
      if (Platform.OS === "ios" && isHealthKitAvailable && AppleHealthKit) {
        const healthPermissions = {
          permissions: {
            read: [
              "Steps",
              "DistanceWalkingRunning",
              "ActiveEnergyBurned",
              "HeartRate",
              "SleepAnalysis",
              "Workout",
            ],
            write: [],
          },
        };

        AppleHealthKit.initHealthKit(healthPermissions, (error: any) => {
          if (error) {
            Alert.alert("Error", "Failed to connect to Apple Health");
          } else {
            setHealthConnected(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        });
      } else if (Platform.OS === "ios" && !isHealthKitAvailable) {
        Alert.alert(
          "Native Build Required",
          'Apple Health integration requires a native build. Please create a development build using "eas build --platform ios --profile development" to enable this feature.',
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Health Data Not Available",
          "Apple Health integration is only available on iOS devices.",
          [{ text: "OK" }],
        );
      }
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  // Background sync functions
  const loadBackgroundSyncStatus = async () => {
    try {
      const status = await backgroundSyncService.getStatus();
      setBackgroundSyncStatus(status);
      setBackgroundSyncEnabled(status.enabled);
    } catch (error) {
      console.error("[SETTINGS] Failed to load background sync status:");
    }
  };

  const toggleBackgroundSync = async () => {
    try {
      if (backgroundSyncEnabled) {
        await backgroundSyncService.disable();
        setBackgroundSyncEnabled(false);
      } else {
        await backgroundSyncService.enable();
        setBackgroundSyncEnabled(true);
      }

      // Reload status
      await loadBackgroundSyncStatus();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("[SETTINGS] Failed to toggle background sync:");
      Alert.alert("Error", "Failed to update background sync settings");
    }
  };

  const manualBackgroundSync = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Show loading state
      Alert.alert(
        "Syncing...",
        "Querying fresh data from Apple Health and syncing to backend...",
      );

      const success = await backgroundSyncService.triggerSync("manual");

      if (success) {
        Alert.alert(
          "Sync Complete",
          "Fresh health data has been queried from Apple Health and synced to your backend. ChatGPT will now have your latest health information.",
          [
            {
              text: "OK",
              onPress: () =>
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
            },
          ],
        );
        await loadBackgroundSyncStatus(); // Refresh status
      } else {
        Alert.alert(
          "Sync Issue",
          "Could not sync health data. This might be due to missing Apple Health permissions, network issues, or no new data available.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("[SETTINGS] Manual sync failed:");
      Alert.alert(
        "Sync Error",
        "Failed to sync health data. Please check your Apple Health permissions and network connection.",
        [{ text: "OK" }],
      );
    }
  };

  const showSyncIntervalOptions = () => {
    const intervals = [
      { label: "15 minutes", value: 15 },
      { label: "30 minutes", value: 30 },
      { label: "1 hour", value: 60 },
      { label: "2 hours", value: 120 },
      { label: "4 hours", value: 240 },
      { label: "6 hours", value: 360 },
    ];

    Alert.alert(
      "Sync Interval",
      "How often should the app sync your health data in the background?",
      [
        ...intervals.map((interval) => ({
          text: interval.label,
          onPress: async () => {
            try {
              await backgroundSyncService.updateConfig({
                intervalMinutes: interval.value,
              });
              await loadBackgroundSyncStatus();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
              console.error("[SETTINGS] Failed to update sync interval:");
              Alert.alert("Error", "Failed to update sync interval");
            }
          },
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const setupHealthAgents = async () => {
    try {
      console.log("[SETTINGS] Setting up health agents...");

      const response = await authorizedFetch("/api/health-agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "setup" }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("[SETTINGS] Health agents setup complete:");

        Alert.alert(
          "Health Agents Setup Complete",
          `Successfully setup ${result.agentsCount || 4} health agents including the new Meal Tracker!\n\nAgents created:\n- Morning Motivator\n- Nutrition Guide\n- Meal Tracker\n- Health Analyst\n\nYou can now test them with "Test Health Agents".`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Setup Failed",
          result.error || result.message || "Unknown error",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("[SETTINGS] Health agents setup failed:");
      Alert.alert(
        "Setup Failed",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    }
  };

  // Agent timing functions
  const updateAgentSchedule = async (
    agentType: string,
    newTime: string,
    triggerCondition?: string,
  ) => {
    try {
      console.log("[SETTINGS] Updating agent schedule:");

      const response = await authorizedFetch("/api/health-agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_schedule",
          agentType,
          newTime,
          triggerCondition,
          timezone: getUserTimezone(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("[SETTINGS] Agent schedule updated successfully");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        throw new Error(result.error || "Failed to update agent schedule");
      }
    } catch (error) {
      console.error("[SETTINGS] Failed to update agent schedule:");
      Alert.alert(
        "Update Failed",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    }
  };

  const handleTimeChange = (agentKey: string, newTime: string) => {
    setAgentTimes((prev) => ({ ...prev, [agentKey]: newTime }));
    setShowTimePicker(null);

    // Map the key to agent type and trigger condition for API
    const agentTypeMapping = {
      morning_motivator: {
        agentType: "morning_motivator",
        triggerCondition: "wake_up",
      },
      nutrition_guide_morning: {
        agentType: "nutrition_guide",
        triggerCondition: "before_meal",
      },
      nutrition_guide_evening: {
        agentType: "nutrition_guide",
        triggerCondition: "before_dinner",
      },
      meal_tracker_breakfast: {
        agentType: "meal_tracker",
        triggerCondition: "after_breakfast",
      },
      meal_tracker_lunch: {
        agentType: "meal_tracker",
        triggerCondition: "after_lunch",
      },
      meal_tracker_dinner: {
        agentType: "meal_tracker",
        triggerCondition: "after_dinner",
      },
      health_analyst: {
        agentType: "health_analyst",
        triggerCondition: "evening_summary",
      },
    };

    const mapping = agentTypeMapping[agentKey as keyof typeof agentTypeMapping];
    if (mapping) {
      updateAgentSchedule(mapping.agentType, newTime, mapping.triggerCondition);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const scrollToSelectedTime = (
    scrollViewRef: any,
    selectedTime: string,
    timeOptions: string[],
  ) => {
    const selectedIndex = timeOptions.findIndex(
      (time) => time === selectedTime,
    );
    if (selectedIndex !== -1 && scrollViewRef.current) {
      // Calculate scroll position to center the selected item
      // Each item is about 56px height (p-4 = 16px top + 16px bottom + text height ~24px)
      const itemHeight = 56;
      const containerHeight = 256; // max-h-64 = 256px
      const scrollY = Math.max(
        0,
        selectedIndex * itemHeight - containerHeight / 2 + itemHeight / 2,
      );

      // Add a small delay to ensure the modal is fully rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 100);
    }
  };

  const settingsSections: SettingsSection[] = [
    {
      title: "ACCOUNT",
      items: [
        {
          title: "Email",
          subtitle: user?.email || "Not available",
          icon: "mail-outline",
          type: "info",
        },
        {
          title: "Subscription",
          subtitle: "ChatHealth Pro",
          icon: "card-outline",
          type: "navigation",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to subscription management
          },
        },
      ],
    },
    {
      title: "HEALTH DATA",
      items: [
        {
          title: "Apple Health",
          subtitle: healthConnected
            ? "Connected and syncing"
            : isHealthKitAvailable
              ? "Connect to sync health data"
              : "Requires native build",
          icon: "heart-outline",
          type: "toggle",
          value: healthConnected,
          onToggle: toggleHealthConnection,
        },
        {
          title: "Background Sync",
          subtitle: backgroundSyncEnabled
            ? `Auto-sync every ${backgroundSyncStatus?.configuredInterval || 60} minutes`
            : "Enable automatic health data sync",
          icon: "refresh-outline",
          type: "toggle",
          value: backgroundSyncEnabled,
          onToggle: toggleBackgroundSync,
        },
        {
          title: "Sync Interval",
          subtitle: `Sync every ${backgroundSyncStatus?.configuredInterval || 60} minutes`,
          icon: "time-outline",
          type: "action",
          onPress: showSyncIntervalOptions,
          disabled: !backgroundSyncEnabled,
        },
        {
          title: "Manual Sync",
          subtitle: backgroundSyncStatus?.lastSync
            ? `Last sync: ${backgroundSyncStatus.lastSync.toLocaleTimeString()}`
            : "Tap to sync health data now",
          icon: "sync-outline",
          type: "action",
          onPress: manualBackgroundSync,
        },
        {
          title: "Sync Status",
          subtitle: backgroundSyncEnabled
            ? `Fresh data from Apple Health automatically synced`
            : "Enable background sync for fresh data",
          icon: "checkmark-circle-outline",
          type: "info",
        },
        {
          title: "Data Privacy",
          subtitle: "Manage your health data privacy",
          icon: "shield-outline",
          type: "navigation",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to privacy settings
          },
        },
        {
          title: "Export Data",
          subtitle: "Download your health data",
          icon: "download-outline",
          type: "action",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert("Export Data", "This feature will be available soon.");
          },
        },
      ],
    },
    {
      title: "PREFERENCES",
      items: [
        {
          title: "Notifications",
          subtitle: "Health reminders and updates",
          icon: "notifications-outline",
          type: "toggle",
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },

        {
          title: "Health Agents",
          subtitle: agentsEnabled
            ? "Agents are active and sending notifications"
            : "Agents are disabled",
          icon: "people-outline",
          type: "toggle",
          value: agentsEnabled,
          onToggle: (enabled: boolean) => {
            setAgentsEnabled(enabled);
            if (enabled) {
              setupHealthAgents();
            } else {
              // TODO: Implement disable agents functionality if needed
              console.log("[SETTINGS] Health agents disabled");
            }
          },
        },

        // Agent time settings - only show when agents are enabled
        ...(agentsEnabled
          ? [
              {
                title: "Morning Motivator",
                subtitle: `Daily at ${formatTime(agentTimes.morning_motivator)}`,
                icon: "sunny-outline",
                type: "navigation" as const,
                rightText: formatTime(agentTimes.morning_motivator),
                onPress: () => setShowTimePicker("morning_motivator"),
              },
              {
                title: "Nutrition Guide (Morning)",
                subtitle: `Daily at ${formatTime(agentTimes.nutrition_guide_morning)}`,
                icon: "restaurant-outline",
                type: "navigation" as const,
                rightText: formatTime(agentTimes.nutrition_guide_morning),
                onPress: () => setShowTimePicker("nutrition_guide_morning"),
              },
              {
                title: "Nutrition Guide (Evening)",
                subtitle: `Daily at ${formatTime(agentTimes.nutrition_guide_evening)}`,
                icon: "wine-outline",
                type: "navigation" as const,
                rightText: formatTime(agentTimes.nutrition_guide_evening),
                onPress: () => setShowTimePicker("nutrition_guide_evening"),
              },
              {
                title: "Meal Tracker (Breakfast)",
                subtitle: `Daily at ${formatTime(agentTimes.meal_tracker_breakfast)}`,
                icon: "cafe-outline",
                type: "navigation" as const,
                rightText: formatTime(agentTimes.meal_tracker_breakfast),
                onPress: () => setShowTimePicker("meal_tracker_breakfast"),
              },
              {
                title: "Meal Tracker (Lunch)",
                subtitle: `Daily at ${formatTime(agentTimes.meal_tracker_lunch)}`,
                icon: "fast-food-outline",
                type: "navigation" as const,
                rightText: formatTime(agentTimes.meal_tracker_lunch),
                onPress: () => setShowTimePicker("meal_tracker_lunch"),
              },
              {
                title: "Meal Tracker (Dinner)",
                subtitle: `Daily at ${formatTime(agentTimes.meal_tracker_dinner)}`,
                icon: "restaurant-outline",
                type: "navigation" as const,
                rightText: formatTime(agentTimes.meal_tracker_dinner),
                onPress: () => setShowTimePicker("meal_tracker_dinner"),
              },
              {
                title: "Daily Health Analyst",
                subtitle: `Daily at ${formatTime(agentTimes.health_analyst)}`,
                icon: "analytics-outline",
                type: "navigation" as const,
                rightText: formatTime(agentTimes.health_analyst),
                onPress: () => setShowTimePicker("health_analyst"),
              },
            ]
          : []),

        {
          title: "Haptic Feedback",
          subtitle: "Vibration for interactions",
          icon: "phone-portrait-outline",
          type: "toggle",
          value: hapticEnabled,
          onToggle: setHapticEnabled,
        },
        {
          title: "Language",
          subtitle: "English",
          icon: "language-outline",
          type: "navigation",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to language settings
          },
        },
      ],
    },
    {
      title: "SUPPORT",
      items: [
        {
          title: "Help Center",
          icon: "help-circle-outline",
          type: "navigation",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to help center
          },
        },
        {
          title: "Contact Support",
          icon: "chatbubble-outline",
          type: "navigation",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to contact support
          },
        },
        {
          title: "Privacy Policy",
          icon: "document-text-outline",
          type: "navigation",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to privacy policy
          },
        },
        {
          title: "Terms of Service",
          icon: "document-outline",
          type: "navigation",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to terms of service
          },
        },
      ],
    },
  ];

  const SettingsItem: React.FC<{ item: SettingsItem; isLast: boolean }> = ({
    item,
    isLast,
  }) => (
    <TouchableOpacity
      className={`flex-row items-center py-4 px-4 ${!isLast ? "border-b border-gray-200" : ""} ${item.disabled ? "opacity-50" : ""}`}
      onPress={item.disabled ? undefined : item.onPress}
      disabled={item.type === "info" || item.disabled}
    >
      <Ionicons
        name={item.icon as any}
        size={24}
        color={item.disabled ? "#999" : item.color || "#666"}
      />
      <View className="flex-1 ml-4">
        <Text
          className={`font-medium text-base ${item.disabled ? "text-gray-400" : "text-gray-900"}`}
        >
          {item.title}
        </Text>
        {item.subtitle && (
          <Text
            className={`text-sm mt-1 ${item.disabled ? "text-gray-300" : "text-gray-500"}`}
          >
            {item.subtitle}
          </Text>
        )}
      </View>

      {item.type === "toggle" && (
        <Switch
          value={item.value}
          onValueChange={item.disabled ? undefined : item.onToggle}
          disabled={item.disabled}
          trackColor={{ false: "#e5e7eb", true: "#10b981" }}
          thumbColor={item.value ? "#ffffff" : "#ffffff"}
        />
      )}

      {item.type === "navigation" && !item.disabled && (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}

      {item.rightText && (
        <Text
          className={`text-sm mr-2 ${item.disabled ? "text-gray-300" : "text-gray-500"}`}
        >
          {item.rightText}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-100">
      <View className="flex-row items-center justify-between px-4 py-4 bg-white">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.back();
          }}
          className="w-12 h-12 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#000" />
        </TouchableOpacity>

        <Text className="text-xl font-semibold text-gray-900">Settings</Text>

        <View className="w-12 h-12" />
      </View>

      <ScrollView className="flex-1">
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} className="mb-6">
            <Text className="text-gray-500 text-sm font-medium px-4 py-2 uppercase tracking-wide">
              {section.title}
            </Text>
            <View className="bg-white">
              {section.items.map((item, itemIndex) => (
                <SettingsItem
                  key={itemIndex}
                  item={item}
                  isLast={itemIndex === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <View className="mx-4 mb-8">
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-white border border-red-200 rounded-lg py-4 px-4"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text className="text-red-500 font-medium ml-2">Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View className="items-center pb-8">
          <Text className="text-gray-400 text-sm">ChatHealth v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={!!showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(null)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowTimePicker(null)}
        >
          <View className="bg-white rounded-xl mx-6 max-h-96">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-center">
                Set{" "}
                {showTimePicker
                  ?.replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                Time
              </Text>
            </View>

            <ScrollView ref={timePickerScrollRef} className="max-h-64">
              {generateTimeOptions().map((time) => (
                <TouchableOpacity
                  key={time}
                  className={`p-4 border-b border-gray-100 ${
                    showTimePicker &&
                    agentTimes[showTimePicker as keyof typeof agentTimes] ===
                      time
                      ? "bg-blue-50"
                      : ""
                  }`}
                  onPress={() => {
                    if (showTimePicker) {
                      handleTimeChange(showTimePicker, time);
                    }
                  }}
                >
                  <Text
                    className={`text-center ${
                      showTimePicker &&
                      agentTimes[showTimePicker as keyof typeof agentTimes] ===
                        time
                        ? "text-blue-600 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {formatTime(time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="p-4">
              <TouchableOpacity
                className="bg-gray-100 rounded-lg py-3"
                onPress={() => setShowTimePicker(null)}
              >
                <Text className="text-center text-gray-700 font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
