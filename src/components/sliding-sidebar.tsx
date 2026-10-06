import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Keyboard,
} from "react-native";
import { useAuth } from "@/contexts/auth";
import { useRouter, usePathname } from "expo-router";
import ChatHistory from "@/components/chat-history";
import { SignOutIcon, NewMessageIcon } from "@/components/icons";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width
const MARGIN_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH; // 20% visible margin

interface SlidingSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  currentRoute: string;
  children?: React.ReactNode;
}

export default function SlidingSidebar({
  isVisible,
  onClose,
  currentRoute,
  children,
}: SlidingSidebarProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("chat");

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Determine the active section based on the current route
  useEffect(() => {
    const getSection = (route: string) => {
      if (route === "/checkin") return "checkin";
      if (route === "/labs") return "labs";
      if (route === "/prevention") return "prevention";
      if (route === "/lifestyle") return "lifestyle";
      if (route === "/consultations") return "consultations";
      return "chat";
    };

    setActiveSection(getSection(currentRoute));
  }, [currentRoute]);

  // Animate sidebar and content in/out based on visibility
  useEffect(() => {
    if (isVisible) {
      // Dismiss keyboard when sidebar opens
      Keyboard.dismiss();

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateX, {
          toValue: SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleClose = () => {
    console.log("Sidebar: Triggering haptic feedback");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  const handleNavigation = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose(); // Close sidebar first
    setTimeout(() => {
      router.push(route);
    }, 250); // Wait for close animation
  };

  return (
    <View className="flex-1">
      {/* Background content that slides */}
      {children && (
        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateX: contentTranslateX }],
          }}
        >
          {children}
        </Animated.View>
      )}

      {/* Sidebar overlay */}
      {isVisible && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: overlayOpacity,
          }}
          pointerEvents={isVisible ? "auto" : "none"}
        >
          {/* Sidebar */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: SIDEBAR_WIDTH,
              transform: [{ translateX: slideAnim }],
            }}
            className="bg-gray-100 shadow-2xl"
          >
            <View className="flex-row justify-between items-center px-4 py-4">
              <Pressable
                onPress={handleSignOut}
                className="flex-row items-center bg-[#EFEFEF] rounded-full px-4 py-2"
              >
                <SignOutIcon color="#000" size={16} />
                <Text className="text-black font-medium ml-2">Sign Out</Text>
              </Pressable>

              <View className="w-14 h-14">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onClose();
                    setTimeout(() => {
                      router.push("/chat");
                    }, 250);
                  }}
                  className="w-14 h-14 items-center justify-center"
                >
                  <NewMessageIcon color="#000" size={22} />
                </Pressable>
              </View>
            </View>

            {/* Scrollable Navigation + Chat History */}
            <View className="flex-1">
              <ChatHistory
                currentRoute={currentRoute}
                onNavigate={handleNavigation}
              />
            </View>

            {/* Settings Section at bottom */}
            <View className="px-4 py-4 border-t border-gray-200">
              <TouchableOpacity
                className="flex-row items-center py-3 px-4 rounded-lg"
                onPress={() => handleNavigation("/settings")}
              >
                <Ionicons name="settings-outline" size={24} color="#000" />
                <Text className="text-black font-semibold text-lg ml-4">
                  Settings
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Touchable margin area to close sidebar */}
          <TouchableWithoutFeedback onPress={handleClose}>
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: MARGIN_WIDTH,
              }}
            />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}
    </View>
  );
}
