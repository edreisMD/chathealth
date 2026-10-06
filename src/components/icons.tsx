import React from "react";
import { View } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import AntDesign from "react-native-vector-icons/AntDesign";

// Hamburger menu icon with two horizontal lines
export const HamburgerIcon = ({ color = "#000", size = 20 }) => (
  <View className="w-6 h-6 justify-center items-center">
    <View className="w-6 h-0.5 rounded-sm mb-2 bg-black" />
    <View className="w-6 h-0.5 rounded-sm bg-black" />
  </View>
);

// Chat balloon icon using react-native-vector-icons
export const ChatIcon = ({ color = "#000", size = 20 }) => (
  <Ionicons name="chatbubble-outline" size={size} color={color} />
);

// Check-in icon using react-native-vector-icons
export const CheckInIcon = ({ color = "#000", size = 20 }) => (
  <Ionicons name="checkmark-circle-outline" size={size} color={color} />
);

// New message icon using react-native-vector-icons
export const NewMessageIcon = ({ color = "#000", size = 20 }) => (
  <Ionicons name="chatbubble-outline" size={size} color={color} />
);

// Back arrow icon using react-native-vector-icons
export const BackIcon = ({ color = "#000", size = 20 }) => (
  <Ionicons name="arrow-back" size={size} color={color} />
);

// Sign out icon using react-native-vector-icons
export const SignOutIcon = ({ color = "#000", size = 20 }) => (
  <Feather name="log-out" size={size} color={color} />
);
