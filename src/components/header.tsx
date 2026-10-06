import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  TouchableOpacity,
  Platform,
  Keyboard,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { HamburgerIcon, NewMessageIcon } from "./icons";
import Feather from "react-native-vector-icons/Feather";
import NavigationSelector from "./health-tabs-selector";
import * as Haptics from "expo-haptics";

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedModel, setSelectedModel] = useState("GPT-5");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    console.log("Header: Platform:");
    console.log("Header: Haptics available:");
  }, []);

  // Animated values for press animations
  const hamburgerScale = useRef(new Animated.Value(1)).current;
  const rightIconScale = useRef(new Animated.Value(1)).current;

  // Check if we're on different pages
  const onCheckin = pathname === "/checkin";
  const onChat = pathname === "/" || pathname.includes("/chat");

  const animatePress = (animValue: Animated.Value, callback: () => void) => {
    // Medium haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call navigation immediately for faster response
    callback();

    // Run animation without blocking navigation
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const navigateToSidebar = () => {
    console.log("Header: Triggering haptic feedback");

    // Dismiss keyboard first to prevent it staying open
    Keyboard.dismiss();

    // Medium haptic feedback for sidebar toggle
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      .then(() => {
        console.log("Header: Haptic feedback completed");
      })
      .catch((error) => {
        console.log("Header: Haptic feedback failed:");
      });

    // Use the sliding sidebar if available, otherwise fall back to route navigation
    if (onOpenSidebar) {
      onOpenSidebar();
    } else {
      router.push({
        pathname: "/sidebar",
        params: { previousRoute: pathname },
      });
    }
  };

  const handleNewChat = () => {
    router.push("/chat");
  };

  const getSelectedTab = () => {
    if (pathname === "/checkin") return "checkin";
    if (pathname === "/labs") return "labs";
    if (pathname === "/prevention") return "prevention";
    if (pathname === "/lifestyle") return "lifestyle";
    if (pathname === "/consultations") return "consultations";
    return "chat";
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-4">
      {/* Left - Hamburger Menu */}
      <View className="w-12 h-12">
        <Pressable
          onPress={navigateToSidebar}
          className="w-12 h-12 items-center justify-center"
        >
          <HamburgerIcon color="#000" size={22} />
        </Pressable>
      </View>

      {/* Center - Title based on current screen */}
      <View className="flex-1 items-center">
        {onChat ? (
          <View className="flex-row items-center">
            <Text className="text-black font-semibold text-xl">
              ChatHealth{" "}
            </Text>
            <Text className="text-gray-500 font-semibold text-xl">GPT-5</Text>
          </View>
        ) : (
          <NavigationSelector selectedTab={getSelectedTab()} />
        )}
      </View>

      {/* Right - New Message Icon */}
      <View className="w-12 h-12">
        <Animated.View style={{ transform: [{ scale: rightIconScale }] }}>
          <Pressable
            onPress={() => animatePress(rightIconScale, handleNewChat)}
            className="w-12 h-12 items-center justify-center"
          >
            <NewMessageIcon color="#000" size={22} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
