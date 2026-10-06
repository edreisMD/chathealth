import React, { useState } from "react";
import Checkins from "@/components/checkins";
import Header from "@/components/header";
import SlidingSidebar from "@/components/sliding-sidebar";
import { View } from "react-native";
import { usePathname } from "expo-router";

export default function CheckinPage() {
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
      <View className="flex-1 bg-gray-100">
        <Header onOpenSidebar={openSidebar} />
        <Checkins />
      </View>
    </SlidingSidebar>
  );
}
