import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: () => void;
}

interface ChatSuggestionsProps {
  onSuggestionPress: (suggestion: string) => void;
  onNavigateToLifestyle?: () => void;
}

export default function ChatSuggestions({
  onSuggestionPress,
  onNavigateToLifestyle,
}: ChatSuggestionsProps) {
  const [pressedId, setPressedId] = useState<string | null>(null);

  const suggestions: Suggestion[] = [
    {
      id: "checkin",
      title: "Make a check-in",
      description: "Record your daily health status and symptoms",
      icon: "checkmark-circle-outline",
      action: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSuggestionPress(
          "I want to make a check-in. This is how I am feeling today:",
        );
      },
    },
    {
      id: "lab-test",
      title: "Submit laboratory test",
      description: "Upload and analyze your lab results",
      icon: "flask-outline",
      action: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSuggestionPress(
          "Here is my latest lab test photo. Can you analyze the results and provide insights?",
        );
      },
    },
    {
      id: "lifestyle",
      title: "Review wearable data",
      description: "Get insights about your daily health patterns",
      icon: "pulse-outline",
      action: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSuggestionPress(
          "Can you help me review my wearable data and health patterns? What insights can you provide?",
        );
      },
    },
  ];

  return (
    <View className="px-4 pb-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 0 }}
        className="flex-row"
      >
        {suggestions.map((suggestion, index) => {
          const isPressed = pressedId === suggestion.id;
          return (
            <TouchableOpacity
              key={suggestion.id}
              onPress={suggestion.action}
              onPressIn={() => setPressedId(suggestion.id)}
              onPressOut={() => setPressedId(null)}
              className={`${isPressed ? "bg-[#D1D1D1]" : "bg-[#EFEFEF]"} rounded-xl px-3 py-2.5 min-w-[240px] max-w-[240px] ${
                index < suggestions.length - 1 ? "mr-3" : ""
              }`}
              activeOpacity={1}
            >
              <View>
                <View className="flex-row items-center mb-1">
                  <Ionicons name={suggestion.icon} size={18} color="#555" />
                  <Text className="font-medium text-gray-900 text-base ml-2 flex-1">
                    {suggestion.title}
                  </Text>
                </View>
                <Text className="text-gray-600 text-sm leading-5">
                  {suggestion.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
