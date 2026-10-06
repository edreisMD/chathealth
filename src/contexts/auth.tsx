import {
  use,
  createContext,
  type PropsWithChildren,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { authorizedFetch, getUserTimezone } from "@/lib/api";
import type { Session, User } from "@supabase/supabase-js";

const AuthContext = createContext<{
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  isAppleSignInAvailable: boolean;
}>({
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
  session: null,
  user: null,
  isLoading: true,
  isSignedIn: false,
  isAppleSignInAvailable: false,
});

// Hook to access auth context
export function useAuth() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error("useAuth must be wrapped in an <AuthProvider />");
  }

  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] =
    useState<boolean>(false);
  const user = session?.user ?? null;

  // Configure Google Sign-In once at startup
  useEffect(() => {
    GoogleSignin.configure({
      scopes: ["email", "profile"],
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  // Check Apple Sign-In availability
  useEffect(() => {
    const checkAppleSignInAvailability = async () => {
      if (Platform.OS === "ios") {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setIsAppleSignInAvailable(isAvailable);
      }
    };
    checkAppleSignInAvailability();
  }, []);

  // Initial session fetch + listener
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setIsLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      setSession(authSession ?? null);

      // Auto-setup health agents on successful sign-in
      if (event === "SIGNED_IN" && authSession?.access_token) {
        setupHealthAgentsOnLogin(authSession.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto-setup health agents for new users on login
  const setupHealthAgentsOnLogin = async (accessToken: string) => {
    try {
      console.log("[AUTH] Setting up health agents automatically on login...");

      const response = await authorizedFetch("/api/health-agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "setup",
          timezone: getUserTimezone(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("[AUTH] Health agents setup completed automatically:");
      } else {
        console.log("[AUTH] Health agents already exist or setup skipped:");
      }
    } catch (error) {
      console.error("[AUTH] Failed to setup health agents on login:");
      // Don't show error to user - this is background setup
    }
  };

  const signInWithGoogle = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken =
        (userInfo as any).data?.idToken ?? (userInfo as any).idToken;
      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In");
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        console.error("Supabase sign-in error");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        console.error("Google sign-in error");
      }
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Sign in via Supabase Auth.
      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });

        if (error) {
          console.error("Apple sign-in error:");
        }
      } else {
        throw new Error("No identity token returned from Apple Sign-In");
      }
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        // User cancelled Apple Sign-In
      } else {
        console.error("Apple sign-in error:");
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await Promise.all([supabase.auth.signOut(), GoogleSignin.signOut()]);
    } catch (e) {
      console.error("Error signing out");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signInWithGoogle,
        signInWithApple,
        signOut,
        session,
        user,
        isLoading,
        isSignedIn: !!session,
        isAppleSignInAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
