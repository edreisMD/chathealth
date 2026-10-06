import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import NavigationSelector from "@/components/health-tabs-selector";
import Header from "@/components/header";
import SlidingSidebar from "@/components/sliding-sidebar";

export default function ConsultationsScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const pathname = usePathname();

  const openSidebar = () => {
    setSidebarVisible(true);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  return (
    <SlidingSidebar
      isVisible={sidebarVisible}
      onClose={closeSidebar}
      currentRoute={pathname}
    >
      <View className="flex-1 bg-gray-50">
        <Header onOpenSidebar={openSidebar} />

        <ScrollView className="flex-1 px-4 py-6">
          <View className="items-center justify-center flex-1">
            <Ionicons
              name="person-outline"
              size={64}
              color="#666"
              className="mb-4"
            />
            <Text className="text-2xl font-bold text-gray-800 mb-2">
              Consultations
            </Text>
            <Text className="text-gray-600 text-center">
              Consultations content will be available here soon.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SlidingSidebar>
  );
}
