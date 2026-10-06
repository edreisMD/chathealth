import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, usePathname } from "expo-router";
import Header from "@/components/header";
import Chat from "@/components/chat";
import SlidingSidebar from "@/components/sliding-sidebar";
import { authorizedFetch } from "@/lib/api";
import { routes } from "@/lib/routes";
import { UIMessage } from "ai";

export default function ChatByIdPage() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const pathname = usePathname();

  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [hasMessages, setHasMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    async function fetchChat() {
      if (!chatId) return;
      try {
        setLoading(true);
        setError(null);
        const chatIdStr = Array.isArray(chatId) ? chatId[0] : chatId;
        const response = await authorizedFetch(routes.messages, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chatId: chatIdStr }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch chat");
        }

        const data: UIMessage[] = await response.json();
        setInitialMessages(data);
        setHasMessages(data.length > 0);
      } catch (err) {
        console.error("ChatHealth: operation status");
        setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        setLoading(false);
      }
    }

    fetchChat();
  }, [chatId]);

  const openSidebar = () => {
    setSidebarVisible(true);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#6B7280" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-100 justify-center items-center px-4">
        <Text className="text-red-600 text-center mb-4">{error}</Text>
      </View>
    );
  }

  const chatIdStr = Array.isArray(chatId) ? chatId[0] : chatId;

  return (
    <SlidingSidebar
      isVisible={sidebarVisible}
      onClose={closeSidebar}
      currentRoute={pathname}
    >
      <View className="flex-1 bg-gray-100">
        <Header onOpenSidebar={openSidebar} />
        <Chat
          chatId={chatIdStr}
          initialMessages={initialMessages}
          onMessagesChange={setHasMessages}
        />
      </View>
    </SlidingSidebar>
  );
}
