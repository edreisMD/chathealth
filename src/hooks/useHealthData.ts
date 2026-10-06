import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { syncHealthDataToBackend } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { backgroundSyncService } from "@/services/backgroundSync";

// Import react-native-health with proper error handling
let AppleHealthKit: any = null;
try {
  AppleHealthKit = require("react-native-health");
  console.log("react-native-health loaded successfully");
} catch (error) {
  console.log("react-native-health not available:");
}

interface HealthData {
  steps: number;
  distance: number;
  flights: number;
  activeEnergy: number;
  basalEnergy: number;
  heartRate: number;
  sleepHours: number;
  workouts: number;
  weight: number;
  height: number;
  bodyFatPercentage: number;
  bmi: number;
  bloodGlucose: number;
  respiratoryRate: number;
  bodyTemperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
}

interface HealthDataWithDates {
  steps: { value: number; date: Date | null };
  distance: { value: number; date: Date | null };
  flights: { value: number; date: Date | null };
  activeEnergy: { value: number; date: Date | null };
  basalEnergy: { value: number; date: Date | null };
  heartRate: { value: number; date: Date | null };
  sleepHours: { value: number; date: Date | null };
  workouts: { value: number; date: Date | null };
  weight: { value: number; date: Date | null };
  height: { value: number; date: Date | null };
  bodyFatPercentage: { value: number; date: Date | null };
  bmi: { value: number; date: Date | null };
  bloodGlucose: { value: number; date: Date | null };
  respiratoryRate: { value: number; date: Date | null };
  bodyTemperature: { value: number; date: Date | null };
  bloodPressureSystolic: { value: number; date: Date | null };
  bloodPressureDiastolic: { value: number; date: Date | null };
}

export const useHealthData = () => {
  const [healthDataWithDates, setHealthDataWithDates] =
    useState<HealthDataWithDates>({
      steps: { value: 0, date: null },
      distance: { value: 0, date: null },
      flights: { value: 0, date: null },
      activeEnergy: { value: 0, date: null },
      basalEnergy: { value: 0, date: null },
      heartRate: { value: 0, date: null },
      sleepHours: { value: 0, date: null },
      workouts: { value: 0, date: null },
      weight: { value: 0, date: null },
      height: { value: 0, date: null },
      bodyFatPercentage: { value: 0, date: null },
      bmi: { value: 0, date: null },
      bloodGlucose: { value: 0, date: null },
      respiratoryRate: { value: 0, date: null },
      bodyTemperature: { value: 0, date: null },
      bloodPressureSystolic: { value: 0, date: null },
      bloodPressureDiastolic: { value: 0, date: null },
    });

  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");

  // Create a simple healthData object for backwards compatibility
  const healthData: HealthData = {
    steps: healthDataWithDates.steps.value,
    distance: healthDataWithDates.distance.value,
    flights: healthDataWithDates.flights.value,
    activeEnergy: healthDataWithDates.activeEnergy.value,
    basalEnergy: healthDataWithDates.basalEnergy.value,
    heartRate: healthDataWithDates.heartRate.value,
    sleepHours: healthDataWithDates.sleepHours.value,
    workouts: healthDataWithDates.workouts.value,
    weight: healthDataWithDates.weight.value,
    height: healthDataWithDates.height.value,
    bodyFatPercentage: healthDataWithDates.bodyFatPercentage.value,
    bmi: healthDataWithDates.bmi.value,
    bloodGlucose: healthDataWithDates.bloodGlucose.value,
    respiratoryRate: healthDataWithDates.respiratoryRate.value,
    bodyTemperature: healthDataWithDates.bodyTemperature.value,
    bloodPressureSystolic: healthDataWithDates.bloodPressureSystolic.value,
    bloodPressureDiastolic: healthDataWithDates.bloodPressureDiastolic.value,
  };

  // Check if Apple Health is available
  useEffect(() => {
    if (Platform.OS !== "ios") {
      setIsLoading(false);
      return;
    }

    try {
      console.log("=== HealthKit Module Debug ===");
      console.log("AppleHealthKit exists:");
      console.log("AppleHealthKit type:");

      if (AppleHealthKit) {
        console.log("AppleHealthKit keys:");
        console.log("initHealthKit method exists:");
        console.log("Constants exists:");
        if (AppleHealthKit.Constants) {
          console.log("Permissions exist:");
        }
      }
      console.log("=== End Debug ===");

      if (!AppleHealthKit) {
        console.log("AppleHealthKit module not loaded");
        setError("HealthKit module not available - native build required");
        setIsAvailable(false);
        setIsLoading(false);
        return;
      }

      if (typeof AppleHealthKit.initHealthKit !== "function") {
        console.log("AppleHealthKit.initHealthKit is not a function");
        setError(
          "HealthKit native methods not available. Make sure HealthKit capability is enabled in Xcode.",
        );
        setIsAvailable(false);
        setIsLoading(false);
        return;
      }

      console.log("AppleHealthKit module loaded successfully");
      setIsAvailable(true);
      setIsLoading(false);

      // Auto-initialize HealthKit
      initializeHealthKit();
    } catch (error) {
      console.log("Error in HealthKit setup:");
      setError(`HealthKit setup failed: ${error}`);
      setIsAvailable(false);
      setIsLoading(false);
    }
  }, []);

  const getPermissions = () => {
    // Use only proven working permissions
    const basicPermissions = {
      permissions: {
        read: [
          "Steps",
          "FlightsClimbed",
          "DistanceWalkingRunning",
          "ActiveEnergyBurned",
          "HeartRate",
          "SleepAnalysis",
          "Weight",
        ],
        write: [],
      },
    };

    if (!AppleHealthKit?.Constants?.Permissions) {
      console.log("Using basic permissions");
      return basicPermissions;
    }

    try {
      // Only use permissions that we know exist
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.Steps,
            AppleHealthKit.Constants.Permissions.FlightsClimbed,
            AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.SleepAnalysis,
            AppleHealthKit.Constants.Permissions.Weight,
          ],
          write: [],
        },
      };

      // Try to add additional permissions if they exist
      const optionalPermissions = [
        "BasalEnergyBurned",
        "Height",
        "BodyFatPercentage",
        "BodyMassIndex",
        "BloodGlucose",
        "RespiratoryRate",
        "BodyTemperature",
        "BloodPressureSystolic",
        "BloodPressureDiastolic",
      ];

      optionalPermissions.forEach((permission) => {
        try {
          if (AppleHealthKit.Constants.Permissions[permission]) {
            permissions.permissions.read.push(
              AppleHealthKit.Constants.Permissions[permission],
            );
          }
        } catch (e) {
          console.log("ChatHealth: operation status");
        }
      });

      return permissions;
    } catch (error) {
      console.log("Error getting permission constants, using basic:");
      return basicPermissions;
    }
  };

  const initializeHealthKit = () => {
    try {
      console.log("Attempting to initialize AppleHealthKit...");
      const permissions = getPermissions();
      console.log("Using permissions:");

      AppleHealthKit.initHealthKit(permissions, (err: any) => {
        if (err) {
          console.log("Error getting permissions:");
          setError(`Permission error: ${err.message || err}`);
          setHasPermissions(false);
          return;
        }
        console.log("AppleHealthKit permissions granted successfully");
        setHasPermissions(true);
        setError(null);
      });
    } catch (error) {
      console.log("Error initializing AppleHealthKit:");
      setError(`Initialization error: ${error}`);
      setHasPermissions(false);
    }
  };

  // Query health data when we have permissions
  useEffect(() => {
    if (!hasPermissions || !isAvailable || isQuerying) {
      return;
    }

    queryHealthData();
  }, [hasPermissions, isAvailable]);

  const queryLatestDataForMetric = (
    metricType: keyof HealthDataWithDates,
    queryFunction: (
      options: any,
      callback: (err: any, results: any) => void,
    ) => void,
    maxDaysBack: number = 30,
  ) => {
    console.log("ChatHealth: operation status");

    const queryForDate = (daysBack: number) => {
      if (daysBack > maxDaysBack) {
        console.log("ChatHealth: operation status");
        return;
      }

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysBack);

      const startOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
      );
      const endOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23,
        59,
        59,
      );

      const options = {
        date: targetDate.toISOString(),
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        ascending: false,
        limit: 1,
      };

      queryFunction(options, (err: any, results: any) => {
        if (err) {
          console.log("ChatHealth: operation status");
          // Try next day back
          queryForDate(daysBack + 1);
          return;
        }

        let value = 0;
        if (results) {
          if (Array.isArray(results) && results.length > 0) {
            value = results[0].value || 0;
          } else if (results.value) {
            value = results.value;
          }
        }

        if (value > 0) {
          console.log("ChatHealth: operation status");
          setHealthDataWithDates((prev) => ({
            ...prev,
            [metricType]: { value, date: targetDate },
          }));
        } else {
          // Try next day back
          queryForDate(daysBack + 1);
        }
      });
    };

    // Start with today (0 days back)
    queryForDate(0);
  };

  // Safe API call wrapper
  const safeApiCall = (
    apiMethod: string,
    metricType: keyof HealthDataWithDates,
    options: any,
    callback: (err: any, results: any) => void,
    customProcessor?: (results: any) => any,
  ) => {
    try {
      if (AppleHealthKit && typeof AppleHealthKit[apiMethod] === "function") {
        AppleHealthKit[apiMethod](options, (err: any, results: any) => {
          if (err) {
            console.log("ChatHealth: operation status");
            callback(err, null);
            return;
          }

          const processedResults = customProcessor
            ? customProcessor(results)
            : results;
          callback(null, processedResults);
        });
      } else {
        console.log("ChatHealth: operation status");
        callback(null, { value: 0 });
      }
    } catch (error) {
      console.log("ChatHealth: operation status");
      callback(error, null);
    }
  };

  const queryHealthData = () => {
    if (!AppleHealthKit || isQuerying) return;

    try {
      console.log(
        "Starting health data query - finding latest data for each metric...",
      );
      setIsQuerying(true);

      // Query each metric with safe API calls

      // Steps
      queryLatestDataForMetric("steps", (options, callback) => {
        safeApiCall("getStepCount", "steps", options, callback);
      });

      // Distance
      queryLatestDataForMetric("distance", (options, callback) => {
        safeApiCall("getDistanceWalkingRunning", "distance", options, callback);
      });

      // Flights
      queryLatestDataForMetric("flights", (options, callback) => {
        safeApiCall("getFlightsClimbed", "flights", options, callback);
      });

      // Active Energy
      queryLatestDataForMetric("activeEnergy", (options, callback) => {
        safeApiCall("getActiveEnergyBurned", "activeEnergy", options, callback);
      });

      // Basal Energy (might not be available)
      queryLatestDataForMetric("basalEnergy", (options, callback) => {
        safeApiCall("getBasalEnergyBurned", "basalEnergy", options, callback);
      });

      // Heart Rate
      queryLatestDataForMetric("heartRate", (options, callback) => {
        safeApiCall("getHeartRateSamples", "heartRate", options, callback);
      });

      // Sleep Hours
      queryLatestDataForMetric("sleepHours", (options, callback) => {
        safeApiCall(
          "getSleepSamples",
          "sleepHours",
          options,
          callback,
          (results) => {
            if (results && results.length > 0) {
              const totalSleep = results.reduce((total: any, sample: any) => {
                const duration =
                  (new Date(sample.endDate).getTime() -
                    new Date(sample.startDate).getTime()) /
                  (1000 * 60 * 60);
                return total + duration;
              }, 0);
              return { value: Math.round(totalSleep * 10) / 10 };
            }
            return { value: 0 };
          },
        );
      });

      // Workouts - count using getSamples if available
      queryLatestDataForMetric("workouts", (options, callback) => {
        const today = new Date();
        const startOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );
        const workoutOptions = {
          startDate: startOfDay.toISOString(),
          endDate: today.toISOString(),
        };

        safeApiCall(
          "getSamples",
          "workouts",
          workoutOptions,
          callback,
          (results) => {
            const workoutCount = results ? results.length : 0;
            return { value: workoutCount };
          },
        );
      });

      // Weight
      queryLatestDataForMetric(
        "weight",
        (options, callback) => {
          safeApiCall("getLatestWeight", "weight", options, callback);
        },
        90,
      );

      // Height (might not be available)
      queryLatestDataForMetric(
        "height",
        (options, callback) => {
          safeApiCall("getLatestHeight", "height", options, callback);
        },
        365,
      );

      // Body Fat Percentage (might not be available)
      queryLatestDataForMetric(
        "bodyFatPercentage",
        (options, callback) => {
          safeApiCall(
            "getLatestBodyFatPercentage",
            "bodyFatPercentage",
            options,
            callback,
          );
        },
        90,
      );

      // BMI (might not be available)
      queryLatestDataForMetric(
        "bmi",
        (options, callback) => {
          safeApiCall("getLatestBmi", "bmi", options, callback);
        },
        90,
      );

      // Blood Glucose (might not be available)
      queryLatestDataForMetric("bloodGlucose", (options, callback) => {
        safeApiCall(
          "getBloodGlucoseSamples",
          "bloodGlucose",
          options,
          callback,
        );
      });

      // Respiratory Rate (might not be available)
      queryLatestDataForMetric("respiratoryRate", (options, callback) => {
        safeApiCall(
          "getRespiratoryRateSamples",
          "respiratoryRate",
          options,
          callback,
        );
      });

      // Body Temperature (might not be available)
      queryLatestDataForMetric("bodyTemperature", (options, callback) => {
        safeApiCall(
          "getBodyTemperatureSamples",
          "bodyTemperature",
          options,
          callback,
        );
      });

      // Blood Pressure (might not be available)
      queryLatestDataForMetric("bloodPressureSystolic", (options, callback) => {
        safeApiCall(
          "getBloodPressureSamples",
          "bloodPressureSystolic",
          options,
          callback,
          (results) => {
            if (results && results.length > 0) {
              const latestSample = results[results.length - 1];
              return { value: latestSample.bloodPressureSystolicValue || 0 };
            }
            return { value: 0 };
          },
        );
      });

      queryLatestDataForMetric(
        "bloodPressureDiastolic",
        (options, callback) => {
          safeApiCall(
            "getBloodPressureSamples",
            "bloodPressureDiastolic",
            options,
            callback,
            (results) => {
              if (results && results.length > 0) {
                const latestSample = results[results.length - 1];
                return { value: latestSample.bloodPressureDiastolicValue || 0 };
              }
              return { value: 0 };
            },
          );
        },
      );

      // Set querying to false after a delay to allow all async operations to complete
      setTimeout(() => {
        setIsQuerying(false);
        console.log("Health data query completed");
      }, 3000);
    } catch (error) {
      console.log("Error querying health data:");
      setError(`Failed to query health data: ${error}`);
      setIsQuerying(false);
    }
  };

  const requestPermissions = () => {
    if (Platform.OS !== "ios" || !isAvailable) {
      return false;
    }

    if (hasPermissions) {
      console.log("HealthKit permissions already granted, refreshing data...");
      if (!isQuerying) {
        queryHealthData();
      }
      return true;
    }

    console.log("Requesting HealthKit permissions...");
    initializeHealthKit();
    return true;
  };

  // Sync health data to backend
  const syncToBackend = async () => {
    if (!hasPermissions || !isAvailable || syncStatus === "syncing") {
      return;
    }

    try {
      setSyncStatus("syncing");
      console.log("Syncing health data to backend...");

      // Get current session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log("No auth session available for health sync");
        setSyncStatus("idle");
        return;
      }

      // Prepare health data for sync (only non-zero values)
      const healthDataToSync: Record<
        string,
        { value: number; date: Date | null; unit?: string }
      > = {};

      Object.entries(healthDataWithDates).forEach(([key, data]) => {
        if (data.value > 0) {
          healthDataToSync[key] = {
            value: data.value,
            date: data.date,
            unit: getUnitForMetric(key),
          };
        }
      });

      // Only sync if we have data
      if (Object.keys(healthDataToSync).length === 0) {
        console.log("No health data to sync");
        setSyncStatus("idle");
        return;
      }

      // Cache health data for background sync
      await backgroundSyncService.cacheHealthData(healthDataToSync);

      const result = await syncHealthDataToBackend(
        healthDataToSync,
        session.access_token,
      );

      if (result.success) {
        console.log("ChatHealth: operation status");
        setLastSyncAt(new Date());
        setSyncStatus("success");
      } else {
        console.warn("Health data sync completed with issues:");
        setSyncStatus("error");
      }
    } catch (error) {
      console.error("Failed to sync health data to backend:");
      setSyncStatus("error");
    }
  };

  // Helper function to get unit for a metric
  const getUnitForMetric = (metricType: string): string => {
    const unitMap: Record<string, string> = {
      steps: "steps",
      distance: "m",
      flights: "flights",
      activeEnergy: "kcal",
      basalEnergy: "kcal",
      heartRate: "bpm",
      sleepHours: "hours",
      workouts: "sessions",
      weight: "lbs", // Apple Health in US uses pounds
      height: "in", // Apple Health in US uses inches
      bodyFatPercentage: "%",
      bmi: "",
      bloodGlucose: "mg/dL",
      respiratoryRate: "breaths/min",
      bodyTemperature: "°F", // Apple Health in US uses Fahrenheit
      bloodPressureSystolic: "mmHg",
      bloodPressureDiastolic: "mmHg",
    };
    return unitMap[metricType] || "";
  };

  // Sync to backend after health data is queried
  useEffect(() => {
    if (!hasPermissions || !isAvailable || isQuerying) {
      return;
    }

    // Check if we have any health data to sync
    const hasData = Object.values(healthDataWithDates).some(
      (data) => data.value > 0,
    );

    if (hasData && syncStatus === "idle") {
      // Delay sync slightly to allow all data to be gathered
      const syncTimer = setTimeout(() => {
        syncToBackend();
      }, 2000);

      return () => clearTimeout(syncTimer);
    }
  }, [
    hasPermissions,
    isAvailable,
    isQuerying,
    healthDataWithDates,
    syncStatus,
  ]);

  return {
    ...healthData,
    hasPermissions,
    isLoading,
    isAvailable,
    error,
    requestPermissions,
    isQuerying,
    healthDataWithDates,
    lastSyncAt,
    syncStatus,
    syncToBackend, // Expose manual sync function
    triggerBackgroundSync: () => backgroundSyncService.triggerSync("manual"), // Expose background sync
    getBackgroundSyncStatus: () => backgroundSyncService.getStatus(), // Expose sync status
  };
};
