import React, { useState } from "react";
import Chat from "@/components/chat";
import Header from "@/components/header";
import SlidingSidebar from "@/components/sliding-sidebar";
import { View } from "react-native";
import { usePathname } from "expo-router";

export default function ChatPage() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
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
        <Chat onMessagesChange={setHasMessages} />
      </View>
    </SlidingSidebar>
  );
}
