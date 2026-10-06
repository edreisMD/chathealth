import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { fetch as expoFetch } from "expo/fetch";

/**
 * Makes an authenticated HTTP request using the current user's Supabase session token.
 * Automatically includes the Authorization header with the user's access token.
 * Handles null values for body and signal properties by converting them to undefined
 * for compatibility with expo/fetch.
 *
 * @param url - The URL to make the request to
 * @param init - Optional fetch configuration object (headers, method, body, etc.)
 * @returns A Promise that resolves to the fetch Response object
 * @throws Throws an error if no valid auth session is found
 *
 * @example
 * // Making a GET request
 * const response = await authorizedFetch('/api/user/profile');
 * const data = await response.json();
 */
export async function authorizedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  // Get the current user's session from Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session is found, throw an error
  if (!session?.access_token) {
    throw new Error("No auth session");
  }

  const fullUrl = url.startsWith("http") ? url : `${getBaseUrl()}${url}`;

  // Make the request with the user's access token in the Authorization header
  return expoFetch(fullUrl, {
    ...init,
    body: init.body === null ? undefined : init.body,
    signal: init.signal === null ? undefined : init.signal,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${session.access_token}`,
      "x-refresh-token": session.refresh_token ?? "",
    },
  });
}

/**
 * Determines the appropriate API base URL based on the current environment and platform.
 * @returns The base URL for API requests
 * @throws When required environment variables are missing:
 *   - `EXPO_PUBLIC_LOCALHOST_PORT` when EXPO_PUBLIC_API_ENV=development
 *   - `EXPO_PUBLIC_LOCALHOST_IP` when running with --tunnel
 *   - `EXPO_PUBLIC_API_BASE_URL` in production
 * @example
 * // expo start on home WiFi
 * // set EXPO_PUBLIC_LOCALHOST_PORT=3000, EXPO_PUBLIC_LOCALHOST_IP=192.0.2.1
 * // Returns: "http://192.0.2.1:3000"
 * @example
 * // expo start on office WiFi with --tunnel
 * // set EXPO_PUBLIC_LOCALHOST_PORT=3000
 * // Returns: "http://192.0.2.2:3000"
 * @example
 * // Production build
 * // set EXPO_PUBLIC_API_BASE_URL=https://api.example.com
 * // Returns: "https://api.example.com"
 */
export function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_ENV === "development") {
    // Set to your laptop's localhost
    const port = process.env.EXPO_PUBLIC_LOCALHOST_PORT;
    if (!port) {
      throw new Error("LOCALHOST_PORT must be set for local development");
    }

    // Case 1: Managed preview (Expo Go or `expo start`)
    if (Constants.experienceUrl) {
      return Constants.experienceUrl
        .replace(/^exp:\/\//, "http://") // protocol
        .replace(/(:\d+)?\/?$/, `:${port}`); // dev server port
    }

    // Case 2: Dev-client / EAS build (managed or bare) hostUri may look like "192.168.1.5:8081" or "localhost:8081"
    // hostUri might be a domain (e.g., "myapp--username.tunnel.expo.dev:8081") when using Expo tunnel (useful on public wifi)
    // In that case, default to a hardcoded network IP for your laptop's localhost
    if (Constants.expoConfig?.hostUri) {
      const hostUri = Constants.expoConfig.hostUri;
      const [rawLocalhost] = hostUri.split(":");
      const localhostVisible = /^\d{1,3}(\.\d{1,3}){3}$/.test(rawLocalhost);
      const localhostURL = localhostVisible
        ? rawLocalhost
        : process.env.EXPO_PUBLIC_LOCALHOST_IP;
      if (!localhostURL) {
        throw new Error(
          "EXPO_PUBLIC_LOCALHOST_IP must be set for local development",
        );
      }
      return `http://${localhostURL}:${port}`;
    }

    // Case 3: Fallback for local simulators/emulators
    if (__DEV__) {
      // Android emulator sees the host machine at 10.0.2.2
      const host = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
      return `http://${host}:${port}`;
    }
  }

  // Production (built with `eas build --profile production`)
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  // Remove any trailing slash to avoid double slash when concatenating with endpoint paths
  if (baseUrl) return baseUrl.replace(/\/$/, "");

  throw new Error(
    "Cannot determine API base URL. Set EXPO_PUBLIC_API_BASE_URL for production builds.",
  );
}
export const API_ENDPOINTS = {
  CHAT: "/api/chat",
  PERSISTENT_CHAT: "/api/persistent-chat",
  CHAT_HISTORY: "/api/chat-history",
  CHECKIN: "/api/checkin",
  HEALTH_DATA: "/api/health-data",
  NOTIFICATIONS: "/api/notifications",
} as const;

// Health Data Sync API
export interface HealthDataPayload {
  healthData: Record<
    string,
    {
      value: number;
      date: Date | null;
      unit: string;
    }
  >;
  deviceInfo?: {
    name: string;
    bundleId: string;
    platform: string;
  };
}

export async function syncHealthDataToBackend(
  healthData: Record<
    string,
    { value: number; date: Date | null; unit?: string }
  >,
  authToken: string,
): Promise<{
  success: boolean;
  syncedCount?: number;
  totalReceived?: number;
  errors?: string[];
  message?: string;
}> {
  try {
    // Syncing health data to backend

    // Prepare device info
    const deviceInfo = {
      name: "iPhone", // Could be more specific with device detection
      bundleId:
        Constants.expoConfig?.ios?.bundleIdentifier ?? "org.example.chathealth",
      platform: "iOS",
    };

    // Prepare payload
    const payload: HealthDataPayload = {
      healthData: healthData as any,
      deviceInfo,
    };

    // Sending payload to backend

    const response = await fetch(
      `${getBaseUrl()}${API_ENDPOINTS.HEALTH_DATA}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      console.error("[API] Health data sync failed with status:");
      console.error("[API] Response headers:");

      // Try to parse as JSON, but handle cases where it's HTML (like error pages)
      let errorDetails;
      try {
        const contentType = response.headers.get("content-type");
        // Checking response content type

        if (contentType && contentType.includes("application/json")) {
          errorDetails = await response.json();
          console.error("[API] JSON error response:");
        } else {
          const textResponse = await response.text();
          console.error("[API] Non-JSON error response (first 500 chars):");
          errorDetails = {
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
      } catch (parseError) {
        console.error("[API] Failed to parse error response:");
        errorDetails = {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      throw new Error(errorDetails.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    // Health data sync successful
    return result;
  } catch (error) {
    // Enhanced error logging for network issues
    if (
      error instanceof TypeError &&
      error.message === "Network request failed"
    ) {
      console.error("[API] Network request failed - possible causes:");
      console.error("  1. No internet connection");
      console.error("  2. Server unreachable");
      console.error("  3. DNS resolution failure");
      console.error("  4. Request timeout");
      console.error("  Target URL:");

      // Create a more user-friendly error
      const networkError = new Error(
        "Network connection failed. Please check your internet connection and try again.",
      );
      networkError.name = "NetworkError";
      throw networkError;
    }

    console.error("[API] Health data sync error:");
    throw error;
  }
}

export async function getHealthDataFromBackend(authToken: string): Promise<{
  success: boolean;
  healthData: Record<
    string,
    { value: number; date: Date | null; unit: string }
  >;
  lastSync?: number;
  metricsCount?: number;
  message?: string;
}> {
  try {
    // Fetching health data from backend

    const response = await fetch(
      `${getBaseUrl()}${API_ENDPOINTS.HEALTH_DATA}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("[API] Health data fetch failed:");
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    // Health data fetch successful
    return result;
  } catch (error) {
    console.error("[API] Health data fetch error:");
    throw error;
  }
}

export interface NotificationResponse {
  count: number;
  notifications: {
    notificationId: string;
    title: string;
    body: string;
    notificationType: string;
    deliveryStatus: string;
    deepLinkData: any;
    createdAt: string;
    readAt?: string;
  }[];
}

/**
 * Fetch user notifications from the backend
 */
export async function fetchNotifications(): Promise<NotificationResponse> {
  try {
    // Fetching notifications

    const response = await authorizedFetch(API_ENDPOINTS.NOTIFICATIONS);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    // Fetched notifications
    return result;
  } catch (error) {
    console.error("[API] Failed to fetch notifications:");
    throw error;
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(): Promise<{ success: boolean }> {
  try {
    // Marking notifications as read

    const response = await authorizedFetch(API_ENDPOINTS.NOTIFICATIONS, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    // Notifications marked as read
    return result;
  } catch (error) {
    console.error("[API] Failed to mark notifications as read:");
    throw error;
  }
}

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  try {
    // Get timezone using Intl API (available in React Native)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Detected user timezone
    return timezone;
  } catch (error) {
    console.error("[API] Failed to detect timezone, using fallback:");
    // Fallback to a reasonable default
    return "America/New_York";
  }
}

/**
 * Check if network is available by making a simple request
 */
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Make a simple HEAD request to check connectivity with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${getBaseUrl()}/api/health-check`, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn("[API] Network connectivity check failed:");
    return false;
  }
}

/**
 * Send push token and timezone to backend for user
 */
export async function sendPushTokenToBackend(
  pushToken: string,
): Promise<{ success: boolean }> {
  try {
    // Sending push token to backend

    const response = await authorizedFetch("/api/push-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pushToken,
        timezone: getUserTimezone(),
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    // Push token sent successfully
    return result;
  } catch (error) {
    console.error("[API] Failed to send push token:");
    throw error;
  }
}
