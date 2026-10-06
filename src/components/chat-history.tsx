import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { routes } from "@/lib/routes";
import { authorizedFetch } from "@/lib/api";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

interface Chat {
  chatId: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
}

interface ChatHistoryProps {
  onChatSelect?: (chatId: string) => void;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

const CHAT_HISTORY_CACHE_KEY = "chat_history_cache";

export default function ChatHistory({
  onChatSelect,
  currentRoute,
  onNavigate,
}: ChatHistoryProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false); // Only for chat history, not navigation
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Determine the active section based on the current route
  const getActiveSection = (route: string) => {
    if (route === "/checkin") return "checkin";
    if (route === "/labs") return "labs";
    if (route === "/prevention") return "prevention";
    if (route === "/lifestyle") return "lifestyle";
    if (route === "/consultations") return "consultations";
    return "chat";
  };

  const activeSection = getActiveSection(currentRoute || "/");

  const handleNavigation = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onNavigate) {
      onNavigate(route);
    } else {
      router.push(route);
    }
  };

  useEffect(() => {
    loadCachedChatHistory();
    fetchChatHistory();
  }, []);

  const loadCachedChatHistory = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CHAT_HISTORY_CACHE_KEY);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setChats(parsedData);
        console.log("ChatHistory: Loaded cached data:");
      }
    } catch (err) {
      console.log("ChatHistory: Failed to load cached data:");
    }
  };

  const saveChatHistoryToCache = async (chatData: Chat[]) => {
    try {
      await AsyncStorage.setItem(
        CHAT_HISTORY_CACHE_KEY,
        JSON.stringify(chatData),
      );
      console.log("ChatHistory: Cached");
    } catch (err) {
      console.log("ChatHistory: Failed to cache data:");
    }
  };

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authorizedFetch(routes.chatHistory);

      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }

      const data = await response.json();
      setChats(data);
      saveChatHistoryToCache(data); // Cache the fresh data
      console.log("ChatHistory: Fetched fresh data:");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load chat history";
      setError(errorMessage);
      console.log("ChatHistory: Fetch error:");
    } finally {
      setLoading(false);
    }
  };

  const handleChatPress = (chatId: string) => {
    if (onChatSelect) {
      onChatSelect(chatId);
    } else {
      // Default navigation behavior
      router.push(`/chat/${chatId}`);
    }
  };

  // Navigation sections data
  const navigationSections = [
    {
      id: "chat",
      route: "/",
      icon: "chatbubble-outline",
      label: "Chat",
      iconType: "ionicons",
    },
    {
      id: "checkin",
      route: "/checkin",
      icon: "checkmark-circle-outline",
      label: "Check-in",
      iconType: "ionicons",
    },
    {
      id: "labs",
      route: "/labs",
      icon: "flask-outline",
      label: "Labs",
      iconType: "ionicons",
    },
    {
      id: "prevention",
      route: "/prevention",
      icon: "shield-checkmark-outline",
      label: "Prevention",
      iconType: "ionicons",
    },
    {
      id: "lifestyle",
      route: "/lifestyle",
      icon: "pulse-outline",
      label: "Wearables",
      iconType: "ionicons",
    },
    {
      id: "consultations",
      route: "/consultations",
      icon: "person-outline",
      label: "Consultations",
      iconType: "ionicons",
    },
  ];

  const renderNavigationItem = ({ item }: { item: any }) => (
    <View className="px-4">
      <TouchableOpacity
        className={`flex-row items-center py-3 px-4 rounded-lg ${
          activeSection === item.id ? "bg-[#EFEFEF]" : "bg-transparent"
        }`}
        onPress={() => handleNavigation(item.route)}
      >
        {item.iconType === "feather" ? (
          <Feather name={item.icon} size={24} color="#000" />
        ) : (
          <Ionicons name={item.icon} size={24} color="#000" />
        )}
        <Text className="text-black font-semibold text-lg ml-4">
          {item.label}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderChatItem = ({ item }: { item: Chat }) => (
    <View className="px-4">
      <Pressable
        onPress={() => handleChatPress(item.chatId)}
        className="px-4 py-3 active:bg-gray-50 rounded-lg"
      >
        <Text className="text-black text-lg mb-1" numberOfLines={1}>
          {item.title}
        </Text>
        {item.lastMessage && (
          <Text className="text-gray-600 text-sm" numberOfLines={2}>
            {item.lastMessage}
          </Text>
        )}
      </Pressable>
    </View>
  );

  // Navigation buttons are always visible - no full-screen loading/error states

  // Always include navigation sections at the top
  const navigationData = navigationSections.map((section) => ({
    ...section,
    type: "navigation",
  }));

  // Create chat history section with loading/error states
  const chatHistorySection = () => {
    const items = [];

    // Add divider
    items.push({ type: "divider", id: "divider" });

    // Add chat items or loading/error states
    if (loading && chats.length === 0) {
      // Only show loading if we have no cached data
      items.push({ type: "loading", id: "loading" });
    } else if (error && chats.length === 0) {
      // Only show error if we have no cached data
      items.push({ type: "error", id: "error", message: error });
    } else if (chats.length === 0) {
      // Show empty state
      items.push({ type: "empty", id: "empty" });
    } else {
      // Show chat items
      items.push(...chats.map((chat) => ({ ...chat, type: "chat" })));
    }

    return items;
  };

  const combinedData = [...navigationData, ...chatHistorySection()];

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === "navigation") {
      return renderNavigationItem({ item });
    } else if (item.type === "divider") {
      return <View className="py-3" />;
    } else if (item.type === "loading") {
      return (
        <View className="px-4 py-8 items-center">
          <ActivityIndicator size="small" color="#6B7280" />
          <Text className="text-gray-600 text-sm mt-2">
            Loading chat history...
          </Text>
        </View>
      );
    } else if (item.type === "error") {
      return (
        <View className="px-4 py-4">
          <Text className="text-red-600 text-center text-sm mb-2">
            {item.message}
          </Text>
          <Pressable
            onPress={fetchChatHistory}
            className="px-3 py-2 bg-black rounded-lg"
          >
            <Text className="text-white text-sm font-medium text-center">
              Retry
            </Text>
          </Pressable>
        </View>
      );
    } else if (item.type === "empty") {
      return (
        <View className="px-4 py-8 items-center">
          <Text className="text-gray-600 text-center text-sm">
            No chat history found
          </Text>
          <Text className="text-gray-400 text-xs text-center mt-1">
            Start a new conversation to see it here
          </Text>
        </View>
      );
    } else {
      return renderChatItem({ item });
    }
  };

  return (
    <View className="flex-1">
      <FlatList
        data={combinedData}
        renderItem={renderItem}
        keyExtractor={(item) => {
          if (item.type === "chat") {
            return (item as any).chatId;
          } else {
            return (item as any).id;
          }
        }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      />
    </View>
  );
}
