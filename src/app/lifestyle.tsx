import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { useHealthData } from "@/hooks/useHealthData";
import NavigationSelector from "@/components/health-tabs-selector";
import Header from "@/components/header";
import SlidingSidebar from "@/components/sliding-sidebar";

interface LifestyleMetric {
  title: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
  category: "activity" | "vitals" | "body" | "nutrition" | "mental";
  isAvailable: boolean;
  date?: Date | null;
}

export default function LifestyleScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pathname = usePathname();
  const healthData = useHealthData();

  const openSidebar = () => {
    setSidebarVisible(true);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Add haptic feedback for pull-to-refresh
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Trigger background sync for fresh data
      await healthData.triggerBackgroundSync();
    } catch (error) {
      console.error("Error refreshing health data:");
    }
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleRequestPermissions = () => {
    console.log("Connect Health button clicked");
    console.log("Platform:");
    console.log("isAvailable:");
    console.log("hasPermissions:");
    console.log("error:");

    try {
      if (Platform.OS === "ios" && healthData.isAvailable) {
        // HealthKit is available, request actual permissions
        console.log("Requesting HealthKit permissions...");
        const success = healthData.requestPermissions();
        console.log("Permission request result:");

        if (success) {
          Alert.alert(
            "HealthKit Permissions",
            "Please grant access to your health data in the system dialog that appears.",
            [{ text: "OK" }],
          );
        } else {
          Alert.alert(
            "Permission Request Failed",
            "Unable to request HealthKit permissions. Please try again.",
            [{ text: "OK" }],
          );
        }
      } else if (Platform.OS === "ios" && !healthData.isAvailable) {
        Alert.alert(
          "HealthKit Not Available",
          healthData.error ||
            'Apple Health integration requires a native build. Please create a development build using "bunx expo run:ios" to enable this feature.',
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Health Data Not Available",
          "Apple Health integration is only available on iOS devices.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.log("Error in handleRequestPermissions:");
      Alert.alert(
        "Error",
        "An error occurred while requesting health permissions. Please try again.",
        [{ text: "OK" }],
      );
    }
  };

  const refreshData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (healthData.hasPermissions) {
      // Data will refresh automatically through the hook
    } else {
      handleRequestPermissions();
    }
  };

  // Create comprehensive health metrics with smart availability detection
  const createHealthMetrics = (): LifestyleMetric[] => {
    const allMetrics: Omit<LifestyleMetric, "isAvailable" | "date">[] = [
      // Activity Metrics
      {
        title: "Steps",
        value: healthData.steps.toLocaleString(),
        unit: "steps",
        icon: "walk-outline",
        color: "#000000",
        category: "activity",
      },
      {
        title: "Distance",
        value: (healthData.distance / 1000).toFixed(1),
        unit: "km",
        icon: "location-outline",
        color: "#000000",
        category: "activity",
      },
      {
        title: "Flights Climbed",
        value: healthData.flights.toString(),
        unit: "flights",
        icon: "trending-up-outline",
        color: "#000000",
        category: "activity",
      },
      {
        title: "Active Energy",
        value: healthData.activeEnergy.toFixed(0),
        unit: "kcal",
        icon: "flame-outline",
        color: "#000000",
        category: "activity",
      },
      {
        title: "Basal Energy",
        value: healthData.basalEnergy.toFixed(0),
        unit: "kcal",
        icon: "battery-half-outline",
        color: "#000000",
        category: "activity",
      },
      {
        title: "Workouts",
        value: healthData.workouts.toString(),
        unit: "sessions",
        icon: "fitness-outline",
        color: "#000000",
        category: "activity",
      },

      // Vitals Metrics
      {
        title: "Heart Rate",
        value: healthData.heartRate.toString(),
        unit: "bpm",
        icon: "heart-outline",
        color: "#000000",
        category: "vitals",
      },

      {
        title: "Blood Pressure",
        value:
          healthData.bloodPressureSystolic > 0 &&
          healthData.bloodPressureDiastolic > 0
            ? `${healthData.bloodPressureSystolic}/${healthData.bloodPressureDiastolic}`
            : "0/0",
        unit: "mmHg",
        icon: "medical-outline",
        color: "#000000",
        category: "vitals",
      },
      {
        title: "Respiratory Rate",
        value: healthData.respiratoryRate.toString(),
        unit: "breaths/min",
        icon: "leaf-outline",
        color: "#000000",
        category: "vitals",
      },

      {
        title: "Body Temperature",
        value: healthData.bodyTemperature.toFixed(1),
        unit: "°F",
        icon: "thermometer-outline",
        color: "#000000",
        category: "vitals",
      },

      // Body Metrics
      {
        title: "Weight",
        value: healthData.weight > 0 ? healthData.weight.toFixed(1) : "0.0",
        unit: "lbs",
        icon: "scale-outline",
        color: "#000000",
        category: "body",
      },
      {
        title: "Height",
        value:
          healthData.height > 0
            ? `${Math.floor(healthData.height / 12)}'${Math.round(healthData.height % 12)}"`
            : `0'0"`,
        unit: "",
        icon: "resize-outline",
        color: "#000000",
        category: "body",
      },
      {
        title: "Body Fat",
        value: healthData.bodyFatPercentage.toFixed(1),
        unit: "%",
        icon: "body-outline",
        color: "#000000",
        category: "body",
      },

      {
        title: "BMI",
        value: healthData.bmi.toFixed(1),
        unit: "",
        icon: "calculator-outline",
        color: "#000000",
        category: "body",
      },

      // Nutrition & Health
      {
        title: "Blood Glucose",
        value: healthData.bloodGlucose.toFixed(1),
        unit: "mg/dL",
        icon: "medical-outline",
        color: "#000000",
        category: "nutrition",
      },

      // Mental Health
      {
        title: "Sleep",
        value: healthData.sleepHours.toFixed(1),
        unit: "hours",
        icon: "moon-outline",
        color: "#000000",
        category: "mental",
      },
    ];

    // Add availability and date information
    return allMetrics.map((metric) => {
      const metricKey = getMetricKey(metric.title);
      const dateInfo = healthData.healthDataWithDates?.[metricKey];
      const hasData = getMetricValue(metric.title) > 0;

      return {
        ...metric,
        isAvailable: hasData,
        date: dateInfo?.date || null,
      };
    });
  };

  const getMetricKey = (
    title: string,
  ): keyof typeof healthData.healthDataWithDates => {
    const keyMap: Record<string, keyof typeof healthData.healthDataWithDates> =
      {
        Steps: "steps",
        Distance: "distance",
        "Flights Climbed": "flights",
        "Active Energy": "activeEnergy",
        "Basal Energy": "basalEnergy",
        "Heart Rate": "heartRate",
        Sleep: "sleepHours",
        Workouts: "workouts",
        Weight: "weight",
        Height: "height",
        "Body Fat": "bodyFatPercentage",
        BMI: "bmi",
        "Blood Pressure": "bloodPressureSystolic",
        "Respiratory Rate": "respiratoryRate",
        "Body Temperature": "bodyTemperature",
        "Blood Glucose": "bloodGlucose",
      };
    return keyMap[title] || "steps";
  };

  const getMetricValue = (title: string): number => {
    switch (title) {
      case "Steps":
        return healthData.steps;
      case "Distance":
        return healthData.distance;
      case "Flights Climbed":
        return healthData.flights;
      case "Active Energy":
        return healthData.activeEnergy;
      case "Basal Energy":
        return healthData.basalEnergy;
      case "Heart Rate":
        return healthData.heartRate;
      case "Sleep":
        return healthData.sleepHours;
      case "Workouts":
        return healthData.workouts;
      case "Weight":
        return healthData.weight;
      case "Height":
        return healthData.height;
      case "Body Fat":
        return healthData.bodyFatPercentage;
      case "BMI":
        return healthData.bmi;
      case "Blood Pressure":
        return Math.max(
          healthData.bloodPressureSystolic,
          healthData.bloodPressureDiastolic,
        );
      case "Respiratory Rate":
        return healthData.respiratoryRate;
      case "Body Temperature":
        return healthData.bodyTemperature;
      case "Blood Glucose":
        return healthData.bloodGlucose;
      default:
        return 0;
    }
  };

  const formatMetricDate = (date: Date | null): string => {
    if (!date) return "";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Get all metrics and organize them
  const allMetrics = createHealthMetrics();
  const availableMetrics = allMetrics.filter((metric) => metric.isAvailable);
  const unavailableMetrics = allMetrics.filter((metric) => !metric.isAvailable);

  // Sort available metrics by category and then by value (highest first)
  const sortedAvailableMetrics = availableMetrics.sort((a, b) => {
    // First sort by category priority
    const categoryPriority = {
      activity: 0,
      vitals: 1,
      body: 2,
      nutrition: 3,
      mental: 4,
    };
    const aPriority = categoryPriority[a.category];
    const bPriority = categoryPriority[b.category];

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Within the same category, sort by value (highest first for most metrics)
    const aValue = getMetricValue(a.title);
    const bValue = getMetricValue(b.title);
    return bValue - aValue;
  });

  // Format sync status for display
  const getSyncStatusInfo = () => {
    const { syncStatus, lastSyncAt } = healthData;

    switch (syncStatus) {
      case "syncing":
        return { text: "Syncing...", color: "#6b7280", icon: "sync-outline" };
      case "success":
        return {
          text: lastSyncAt ? `Synced ${formatSyncTime(lastSyncAt)}` : "Synced",
          color: "#6b7280",
          icon: "checkmark-circle-outline",
        };
      case "error":
        return {
          text: "Sync failed",
          color: "#6b7280",
          icon: "alert-circle-outline",
        };
      default:
        return null;
    }
  };

  const formatSyncTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const MetricCard: React.FC<{ metric: LifestyleMetric }> = ({ metric }) => {
    const dateString = formatMetricDate(metric.date || null);

    return (
      <TouchableOpacity
        className="bg-white rounded-xl p-4 mb-4 shadow-sm"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <View className="w-10 h-10 items-center justify-center">
              <Ionicons name={metric.icon as any} size={24} color="#000000" />
            </View>
            <Text className="text-gray-600 font-bold text-2xl ml-3">
              {metric.title}
            </Text>
          </View>
          {dateString && (
            <Text className="text-xs text-gray-500">{dateString}</Text>
          )}
        </View>

        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              {metric.value}
            </Text>
            <Text className="text-gray-500 text-sm">{metric.unit}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const CategoryHeader: React.FC<{
    category: string;
    count: number;
    isFirst?: boolean;
  }> = ({ category, count, isFirst = false }) => (
    <View
      className={`flex-row items-center justify-between mb-3 ${isFirst ? "mt-0" : "mt-6"}`}
    >
      <View className="flex-row items-center">
        <Text className="text-3xl font-bold text-gray-800 capitalize">
          {category}
        </Text>
        <View className="ml-2 bg-gray-200 rounded-full px-2 py-1">
          <Text className="text-xs text-gray-600">{count}</Text>
        </View>
      </View>
      {/* Show sync status only for first category (Activity) */}
      {isFirst && getSyncStatusInfo() && (
        <View className="flex-row items-center">
          <Ionicons
            name={getSyncStatusInfo()!.icon as any}
            size={16}
            color={getSyncStatusInfo()!.color}
          />
          <Text
            className="text-sm ml-1"
            style={{ color: getSyncStatusInfo()!.color }}
          >
            {getSyncStatusInfo()!.text}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SlidingSidebar
      isVisible={sidebarVisible}
      onClose={closeSidebar}
      currentRoute={pathname}
    >
      <View className="flex-1 bg-gray-100">
        <Header onOpenSidebar={openSidebar} />

        <ScrollView
          className="flex-1 px-6 py-6"
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000000"
            />
          }
        >
          {!healthData.hasPermissions && Platform.OS === "ios" && (
            <View className="mb-6 flex-row items-center justify-end">
              <TouchableOpacity
                onPress={handleRequestPermissions}
                className="bg-gray-800 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">
                  {healthData.isAvailable ? "Connect Health" : "Health Setup"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {healthData.isLoading ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="refresh-outline" size={32} color="#666" />
              <Text className="text-gray-600 mt-4">Loading health data...</Text>
            </View>
          ) : availableMetrics.length > 0 ? (
            <View>
              {/* Group metrics by category */}
              {["activity", "vitals", "body", "nutrition", "mental"].map(
                (category, categoryIndex) => {
                  const categoryMetrics = sortedAvailableMetrics.filter(
                    (m) => m.category === category,
                  );
                  if (categoryMetrics.length === 0) return null;

                  const isFirstCategory =
                    categoryIndex === 0 ||
                    ["activity", "vitals", "body", "nutrition", "mental"]
                      .slice(0, categoryIndex)
                      .every(
                        (cat) =>
                          sortedAvailableMetrics.filter(
                            (m) => m.category === cat,
                          ).length === 0,
                      );

                  return (
                    <View key={category}>
                      <CategoryHeader
                        category={category}
                        count={categoryMetrics.length}
                        isFirst={isFirstCategory}
                      />
                      {categoryMetrics.map((metric, index) => (
                        <MetricCard
                          key={`${category}-${index}`}
                          metric={metric}
                        />
                      ))}
                    </View>
                  );
                },
              )}

              {/* Metrics summary at bottom */}
              <View className="mt-6 mb-4">
                <Text className="text-gray-600 text-base">
                  {availableMetrics.length} metrics available • Latest data from
                  Apple Health
                </Text>
              </View>

              {/* Show a summary of unavailable metrics */}
              {unavailableMetrics.length > 0 && (
                <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#6b7280"
                    />
                    <Text className="text-gray-700 font-medium ml-2">
                      More Health Data Available
                    </Text>
                  </View>
                  <Text className="text-gray-600 text-sm">
                    {unavailableMetrics.length} additional metrics can be
                    tracked when data becomes available:{" "}
                    {unavailableMetrics
                      .slice(0, 3)
                      .map((m) => m.title)
                      .join(", ")}
                    {unavailableMetrics.length > 3
                      ? ` and ${unavailableMetrics.length - 3} more`
                      : ""}
                    .
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="items-center justify-center py-20">
              <Ionicons name="heart-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-lg font-medium mt-4">
                No Health Data Available
              </Text>
              <Text className="text-gray-400 text-center mt-2 px-8">
                {Platform.OS !== "ios"
                  ? "Apple Health integration is only available on iOS devices."
                  : !healthData.isAvailable
                    ? "Apple Health requires a native build. Create a development build to enable health features."
                    : "Grant permissions to start tracking your health data."}
              </Text>
            </View>
          )}

          {(Platform.OS !== "ios" || !healthData.isAvailable) && (
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#6b7280"
                />
                <Text className="text-gray-700 font-medium ml-2">
                  Health Data Not Available
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">
                {Platform.OS !== "ios"
                  ? "Apple Health integration is only available on iOS devices."
                  : healthData.error ||
                    "Apple Health requires a native build. Create a development build with 'bunx expo run:ios' to enable health features."}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SlidingSidebar>
  );
}
