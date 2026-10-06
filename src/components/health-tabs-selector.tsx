import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Pressable,
  Modal,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface NavigationTab {
  id: string;
  name: string;
  route: string;
  icon: string;
  iconType: "ionicons" | "feather";
}

const ALL_NAVIGATION_TABS: NavigationTab[] = [
  {
    id: "chat",
    name: "Chat",
    route: "/",
    icon: "chatbubble-outline",
    iconType: "ionicons",
  },
  {
    id: "checkin",
    name: "Check-in",
    route: "/checkin",
    icon: "checkmark-circle-outline",
    iconType: "ionicons",
  },
  {
    id: "labs",
    name: "Labs",
    route: "/labs",
    icon: "flask-outline",
    iconType: "ionicons",
  },
  {
    id: "prevention",
    name: "Prevention",
    route: "/prevention",
    icon: "shield-checkmark-outline",
    iconType: "ionicons",
  },
  {
    id: "lifestyle",
    name: "Wearables",
    route: "/lifestyle",
    icon: "pulse-outline",
    iconType: "ionicons",
  },
  {
    id: "consultations",
    name: "Consultations",
    route: "/consultations",
    icon: "person-outline",
    iconType: "ionicons",
  },
];

interface NavigationSelectorProps {
  selectedTab?: string;
  onTabChange?: (tabId: string) => void;
}

export default function NavigationSelector({
  selectedTab = "labs",
  onTabChange,
}: NavigationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const currentTab =
    ALL_NAVIGATION_TABS.find((t) => t.id === selectedTab) ||
    ALL_NAVIGATION_TABS[0];

  const handleTabSelect = (tab: NavigationTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(false);
    onTabChange?.(tab.id);
    router.push(tab.route);
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(!isOpen);
  };

  const renderTabItem = ({
    item,
    index,
  }: {
    item: NavigationTab;
    index: number;
  }) => {
    const isLastItem = index === ALL_NAVIGATION_TABS.length - 1;
    return (
      <TouchableOpacity
        onPress={() => handleTabSelect(item)}
        className={`px-4 ${isLastItem ? "py-3 pb-5" : "py-3"} ${item.id === selectedTab ? "bg-gray-100" : ""}`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {item.iconType === "feather" ? (
              <Feather name={item.icon} size={16} color="#000" />
            ) : (
              <Ionicons name={item.icon} size={16} color="#000" />
            )}
            <Text className="text-gray-900 font-medium ml-3">{item.name}</Text>
          </View>
          {item.id === selectedTab && (
            <Feather name="check" size={16} color="#000" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="relative">
      {/* Health Tab Selector Button */}
      <TouchableOpacity
        onPress={handleToggle}
        className="flex-row items-center bg-transparent px-2 py-1 rounded-lg"
        activeOpacity={0.7}
      >
        {currentTab.iconType === "feather" ? (
          <Feather name={currentTab.icon} size={22} color="#000" />
        ) : (
          <Ionicons name={currentTab.icon} size={22} color="#000" />
        )}
        <Text className="font-semibold text-lg ml-3 mr-1 text-black">
          {currentTab.name}
        </Text>
        <Feather
          name="chevron-down"
          size={16}
          color="#666"
          style={{
            transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
          }}
        />
      </TouchableOpacity>

      {/* Modal Dropdown */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/5"
          onPress={() => setIsOpen(false)}
        >
          <View
            className="flex-1 justify-start items-center"
            style={{ paddingTop: 100 }}
          >
            <View
              className="bg-white rounded-xl border border-gray-200 overflow-hidden mx-6"
              style={{
                minWidth: 200,
                maxWidth: 300,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 20,
              }}
            >
              {/* Tab List */}
              <FlatList
                data={ALL_NAVIGATION_TABS}
                renderItem={renderTabItem}
                keyExtractor={(item) => item.id}
                className="max-h-64"
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
