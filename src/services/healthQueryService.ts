import { Platform } from "react-native";

// Import react-native-health with proper error handling
let AppleHealthKit: any = null;
try {
  if (Platform.OS === "ios") {
    AppleHealthKit = require("react-native-health");
    // react-native-health loaded successfully
  }
} catch (error) {
  console.log("[HealthQuery] react-native-health not available:");
}

interface HealthDataValue {
  value: number;
  date: Date | null;
  unit?: string;
}

export interface HealthQueryResult {
  success: boolean;
  data: Record<string, HealthDataValue>;
  error?: string;
  queriedAt: Date;
}

class HealthQueryService {
  private isQuerying = false;

  /**
   * Query fresh health data from Apple Health
   * This is the standalone version of the queryHealthData logic from useHealthData
   */
  async queryLatestHealthData(): Promise<HealthQueryResult> {
    if (!AppleHealthKit) {
      return {
        success: false,
        data: {},
        error: "Apple HealthKit not available",
        queriedAt: new Date(),
      };
    }

    if (this.isQuerying) {
      return {
        success: false,
        data: {},
        error: "Health query already in progress",
        queriedAt: new Date(),
      };
    }

    try {
      // Starting fresh health data query
      this.isQuerying = true;

      // Check permissions first
      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        return {
          success: false,
          data: {},
          error: "Apple Health permissions not granted",
          queriedAt: new Date(),
        };
      }

      const healthData: Record<string, HealthDataValue> = {};
      const queries = [
        { key: "steps", method: "getStepCount", unit: "steps" },
        { key: "distance", method: "getDistanceWalkingRunning", unit: "m" },
        { key: "flights", method: "getFlightsClimbed", unit: "flights" },
        { key: "activeEnergy", method: "getActiveEnergyBurned", unit: "kcal" },
        { key: "basalEnergy", method: "getBasalEnergyBurned", unit: "kcal" },
        { key: "heartRate", method: "getHeartRateSamples", unit: "bpm" },
      ];

      // Query all metrics in parallel
      const results = await Promise.allSettled(
        queries.map((query) =>
          this.queryMetric(query.key, query.method, query.unit),
        ),
      );

      // Process results
      results.forEach((result, index) => {
        const query = queries[index];
        if (result.status === "fulfilled" && result.value) {
          healthData[query.key] = result.value;
        } else {
          // Set default value for failed queries
          healthData[query.key] = {
            value: 0,
            date: new Date(),
            unit: query.unit,
          };
          if (result.status === "rejected") {
            console.warn("ChatHealth: operation status");
          }
        }
      });

      // Special handling for sleep data
      try {
        const sleepData = await this.querySleepData();
        healthData["sleepHours"] = sleepData;
      } catch (error) {
        console.warn("[HealthQuery] Failed to query sleep data:");
        healthData["sleepHours"] = {
          value: 0,
          date: new Date(),
          unit: "hours",
        };
      }

      // Successfully queried health data

      return {
        success: true,
        data: healthData,
        queriedAt: new Date(),
      };
    } catch (error) {
      console.error("[HealthQuery] Failed to query health data:");
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : "Unknown error",
        queriedAt: new Date(),
      };
    } finally {
      this.isQuerying = false;
    }
  }

  private async checkPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!AppleHealthKit) {
        // AppleHealthKit not available
        resolve(false);
        return;
      }

      AppleHealthKit.isAvailable((error: any, available: boolean) => {
        if (error || !available) {
          // HealthKit not available
          resolve(false);
          return;
        }

        // Check if we have permissions for Steps (as a proxy for health permissions)
        AppleHealthKit.getAuthStatus(
          {
            permissions: {
              read: ["Steps"],
            },
          },
          (error: any, result: any) => {
            // Auth status check
            if (error) {
              console.warn("[HealthQuery] Auth status error:");
              resolve(false);
              return;
            }

            const hasPermission = result && result.Steps === 2; // 2 = authorized in react-native-health
            // Permission check complete
            resolve(hasPermission);
          },
        );
      });
    });
  }

  private async queryMetric(
    key: string,
    method: string,
    unit: string,
  ): Promise<HealthDataValue | null> {
    return new Promise((resolve) => {
      const options = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        endDate: new Date().toISOString(),
      };

      if (!AppleHealthKit[method]) {
        console.warn("ChatHealth: operation status");
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => {
        console.warn("ChatHealth: operation status");
        resolve(null);
      }, 5000); // 5 second timeout

      AppleHealthKit[method](options, (error: any, results: any) => {
        clearTimeout(timeout);

        if (error) {
          console.warn("ChatHealth: operation status");
          resolve(null);
          return;
        }

        try {
          let value = 0;
          let date = new Date();

          if (results && Array.isArray(results) && results.length > 0) {
            // For array results, get the latest entry
            const latest = results[results.length - 1];
            value = latest.value || 0;
            date = latest.endDate ? new Date(latest.endDate) : new Date();
          } else if (results && typeof results.value === "number") {
            // For single value results
            value = results.value;
            date = results.endDate ? new Date(results.endDate) : new Date();
          }

          resolve({
            value: Math.round(value * 100) / 100, // Round to 2 decimal places
            date,
            unit,
          });
        } catch (parseError) {
          console.warn("ChatHealth: operation status");
          resolve(null);
        }
      });
    });
  }

  private async querySleepData(): Promise<HealthDataValue> {
    return new Promise((resolve) => {
      const options = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      };

      if (!AppleHealthKit.getSleepSamples) {
        resolve({ value: 0, date: new Date(), unit: "hours" });
        return;
      }

      const timeout = setTimeout(() => {
        console.warn("[HealthQuery] Sleep query timeout");
        resolve({ value: 0, date: new Date(), unit: "hours" });
      }, 5000);

      AppleHealthKit.getSleepSamples(options, (error: any, results: any) => {
        clearTimeout(timeout);

        if (error || !results || !Array.isArray(results)) {
          resolve({ value: 0, date: new Date(), unit: "hours" });
          return;
        }

        try {
          const totalSleep = results.reduce((total: number, sample: any) => {
            if (sample.value === "ASLEEP" || sample.value === "INBED") {
              const duration =
                (new Date(sample.endDate).getTime() -
                  new Date(sample.startDate).getTime()) /
                (1000 * 60 * 60);
              return total + duration;
            }
            return total;
          }, 0);

          const latestSample = results[results.length - 1];
          const date = latestSample?.endDate
            ? new Date(latestSample.endDate)
            : new Date();

          resolve({
            value: Math.round(totalSleep * 10) / 10,
            date,
            unit: "hours",
          });
        } catch (parseError) {
          console.warn("[HealthQuery] Error parsing sleep data:");
          resolve({ value: 0, date: new Date(), unit: "hours" });
        }
      });
    });
  }

  /**
   * Check if health querying is available
   */
  isAvailable(): boolean {
    return Platform.OS === "ios" && AppleHealthKit !== null;
  }

  /**
   * Get unit for a specific metric type
   */
  getUnitForMetric(metricType: string): string {
    const unitMap: Record<string, string> = {
      steps: "steps",
      distance: "m",
      flights: "flights",
      activeEnergy: "kcal",
      basalEnergy: "kcal",
      heartRate: "bpm",
      sleepHours: "hours",
      workouts: "sessions",
      weight: "lbs",
      height: "in",
      bodyFatPercentage: "%",
      bmi: "",
      bloodGlucose: "mg/dL",
      respiratoryRate: "breaths/min",
      bodyTemperature: "°F",
      bloodPressureSystolic: "mmHg",
      bloodPressureDiastolic: "mmHg",
    };
    return unitMap[metricType] || "";
  }
}

// Export singleton instance
export const healthQueryService = new HealthQueryService();
