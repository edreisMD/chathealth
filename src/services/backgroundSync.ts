import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { syncHealthDataToBackend, checkNetworkConnectivity } from "../lib/api";
import { healthQueryService } from "./healthQueryService";

interface HealthDataValue {
  value: number;
  date: Date | null;
  unit?: string;
}

interface BackgroundSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTimestamp: number;
  syncOnAppForeground: boolean;
  syncOnAppBackground: boolean;
}

const DEFAULT_CONFIG: BackgroundSyncConfig = {
  enabled: true,
  intervalMinutes: 60, // Sync every hour
  lastSyncTimestamp: 0,
  syncOnAppForeground: true,
  syncOnAppBackground: true,
};

const STORAGE_KEYS = {
  CONFIG: "@background_sync_config",
  LAST_SYNC: "@last_health_sync",
  CACHED_HEALTH_DATA: "@cached_health_data",
} as const;

class BackgroundSyncService {
  private config: BackgroundSyncConfig = DEFAULT_CONFIG;
  private syncTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load configuration from storage
      await this.loadConfig();

      // Set up app state listener for foreground/background sync
      this.setupAppStateListener();

      // Start periodic sync timer
      this.startPeriodicSync();

      this.isInitialized = true;
      // Service initialized
    } catch (error) {
      console.error("[BackgroundSync] Failed to initialize:");
    }
  }

  async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn("[BackgroundSync] Failed to load config, using defaults:");
      this.config = DEFAULT_CONFIG;
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CONFIG,
        JSON.stringify(this.config),
      );
    } catch (error) {
      console.error("[BackgroundSync] Failed to save config:");
    }
  }

  async updateConfig(updates: Partial<BackgroundSyncConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();

    // Restart periodic sync with new interval
    if (updates.intervalMinutes) {
      this.stopPeriodicSync();
      this.startPeriodicSync();
    }
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        // App state changed

        if (nextAppState === "active" && this.config.syncOnAppForeground) {
          this.triggerSync("foreground");
        } else if (
          nextAppState === "background" &&
          this.config.syncOnAppBackground
        ) {
          this.triggerSync("background");
        }
      },
    );
  }

  private startPeriodicSync(): void {
    if (!this.config.enabled || this.syncTimer) return;

    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    // Starting periodic sync

    this.syncTimer = setInterval(() => {
      this.triggerSync("periodic");
    }, intervalMs);
  }

  private stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      // Stopped periodic sync
    }
  }

  async triggerSync(
    trigger: "foreground" | "background" | "periodic" | "manual",
  ): Promise<boolean> {
    if (!this.config.enabled) {
      // Sync disabled, skipping
      return false;
    }

    // Check if enough time has passed since last sync
    const now = Date.now();
    const minInterval = 5 * 60 * 1000; // Minimum 5 minutes between syncs

    if (
      trigger === "periodic" &&
      now - this.config.lastSyncTimestamp < minInterval
    ) {
      // Too soon since last sync, skipping
      return false;
    }

    try {
      // Starting sync

      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // No auth session available
        return false;
      }

      // Check if health querying is available first
      if (!healthQueryService.isAvailable()) {
        // Apple Health not available on this platform

        // Try cached data fallback
        const cachedHealthData = await this.getCachedHealthData();
        if (!cachedHealthData || Object.keys(cachedHealthData).length === 0) {
          // No cached health data available either
          return false;
        }

        const result = await syncHealthDataToBackend(
          cachedHealthData,
          session.access_token,
        );
        if (result.success) {
          this.config.lastSyncTimestamp = now;
          await this.saveConfig();
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toString());
          // Sync successful with cached data
          return true;
        }
        return false;
      }

      // Query fresh health data from Apple Health
      // Querying fresh health data
      const healthQueryResult =
        await healthQueryService.queryLatestHealthData();

      if (!healthQueryResult.success) {
        console.log("ChatHealth: operation status");

        // If it's a permissions issue, give helpful guidance
        if (healthQueryResult.error?.includes("permissions")) {
          console.log(
            "[BackgroundSync] ⚠️  Apple Health permissions required. Please open the app and go to Settings > Health Data > Apple Health to grant permissions.",
          );
        }

        // Fallback to cached data if fresh query fails
        const cachedHealthData = await this.getCachedHealthData();
        if (!cachedHealthData || Object.keys(cachedHealthData).length === 0) {
          // No cached health data available either
          return false;
        }

        // Check network connectivity before attempting sync
        const hasNetwork = await checkNetworkConnectivity();
        if (!hasNetwork) {
          console.warn("ChatHealth: operation status");
          return false;
        }

        // Use cached data - with network error handling
        try {
          const result = await syncHealthDataToBackend(
            cachedHealthData,
            session.access_token,
          );
          if (result.success) {
            this.config.lastSyncTimestamp = now;
            await this.saveConfig();
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toString());
            // Sync successful with cached data
            return true;
          }
          return false;
        } catch (networkError) {
          if (
            networkError instanceof Error &&
            networkError.name === "NetworkError"
          ) {
            console.warn("ChatHealth: operation status");
          } else {
            console.warn("ChatHealth: operation status");
          }
          // Don't fail completely - just log the network issue and continue
          // The data will sync when network is restored
          return false;
        }
      }

      const healthData = healthQueryResult.data;

      // Cache the fresh data for future fallback use
      await this.cacheHealthData(healthData);

      // Successfully queried health metrics

      // Check network connectivity before attempting sync
      const hasNetwork = await checkNetworkConnectivity();
      if (!hasNetwork) {
        console.warn("ChatHealth: operation status");
        // Store the fresh data for later sync attempt
        await this.cacheHealthData(healthData);
        return false;
      }

      // Sync fresh data to backend - with network error handling
      try {
        const result = await syncHealthDataToBackend(
          healthData,
          session.access_token,
        );

        if (result.success) {
          // Update last sync timestamp
          this.config.lastSyncTimestamp = now;
          await this.saveConfig();
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toString());

          // Sync successful with fresh data
          return true;
        } else {
          console.warn("ChatHealth: operation status");
          return false;
        }
      } catch (networkError) {
        if (
          networkError instanceof Error &&
          networkError.name === "NetworkError"
        ) {
          console.warn("ChatHealth: operation status");
        } else {
          console.warn("ChatHealth: operation status");
        }
        // Store the fresh data for later sync attempt
        await this.cacheHealthData(healthData);
        // Fresh data cached for later sync attempt
        return false;
      }
    } catch (error) {
      console.error("ChatHealth: operation status");
      return false;
    }
  }

  async cacheHealthData(
    healthData: Record<string, HealthDataValue>,
  ): Promise<void> {
    try {
      const cacheData = {
        data: healthData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_HEALTH_DATA,
        JSON.stringify(cacheData),
      );
      // Cached health data
    } catch (error) {
      console.error("[BackgroundSync] Failed to cache health data:");
    }
  }

  private async getCachedHealthData(): Promise<Record<
    string,
    HealthDataValue
  > | null> {
    try {
      const stored = await AsyncStorage.getItem(
        STORAGE_KEYS.CACHED_HEALTH_DATA,
      );
      if (!stored) return null;

      const { data, timestamp } = JSON.parse(stored);

      // Only use cache if it's less than 6 hours old
      const maxAge = 6 * 60 * 60 * 1000; // 6 hours
      if (Date.now() - timestamp > maxAge) {
        // Cached health data is too old
        return null;
      }

      return data;
    } catch (error) {
      console.error("[BackgroundSync] Failed to get cached health data:");
      return null;
    }
  }

  async getStatus(): Promise<{
    enabled: boolean;
    lastSync: Date | null;
    nextPeriodicSync: Date | null;
    configuredInterval: number;
  }> {
    const lastSyncStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    const lastSync = lastSyncStr ? new Date(parseInt(lastSyncStr)) : null;

    const nextPeriodicSync = lastSync
      ? new Date(lastSync.getTime() + this.config.intervalMinutes * 60 * 1000)
      : null;

    return {
      enabled: this.config.enabled,
      lastSync,
      nextPeriodicSync,
      configuredInterval: this.config.intervalMinutes,
    };
  }

  async enable(): Promise<void> {
    await this.updateConfig({ enabled: true });
    this.startPeriodicSync();
    // Service enabled
  }

  async disable(): Promise<void> {
    await this.updateConfig({ enabled: false });
    this.stopPeriodicSync();
    // Service disabled
  }

  destroy(): void {
    this.stopPeriodicSync();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isInitialized = false;
    // Service destroyed
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();

// Initialize on import
backgroundSyncService.initialize();
