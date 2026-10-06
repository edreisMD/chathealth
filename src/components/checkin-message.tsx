import React from "react";
import { View, Text, Image } from "react-native";
import { MarkdownComponent } from "./markdown";
import { UIMessage } from "ai";

export function CheckinMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  // Format time to show only time in user's timezone
  const formatTime = (timestamp: string | Date) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper function to render only text parts
  const renderTextPart = (part: any, idx: number) => {
    if (part.type === "text") {
      return <MarkdownComponent key={idx}>{part.text}</MarkdownComponent>;
    }
    return null;
  };

  // Helper function to render only image parts
  const renderImagePart = (part: any, idx: number) => {
    if (part.type === "image") {
      return (
        <Image
          key={idx}
          source={{ uri: part.image }}
          className="w-48 h-48 rounded-lg mb-2"
          resizeMode="cover"
        />
      );
    }
    return null;
  };

  return (
    <View className={`py-2 ${isUser ? "items-end" : "items-start"}`}>
      {isUser ? (
        // User message with images outside like chat
        <View className="max-w-[80%] items-end">
          {/* Render images outside and above the message bubble */}
          {message.parts?.map((part: any, idx: number) =>
            renderImagePart(part, idx),
          )}

          {/* Message bubble with only text content */}
          {message.parts &&
            message.parts.some((p: any) => p.type === "text") && (
              <View className="bg-[#EFEFEF] px-4 py-2 rounded-3xl">
                {/* Render only text parts */}
                {message.parts?.map((part: any, idx: number) =>
                  renderTextPart(part, idx),
                )}
              </View>
            )}

          {message.createdAt && (
            <Text className="text-xs text-gray-500 mt-1 text-right">
              {formatTime(message.createdAt)}
            </Text>
          )}
        </View>
      ) : (
        // Agent message (keep current style)
        <View className="max-w-[80%]">
          <View>
            {message.parts?.map((part: any, idx: number) =>
              part.type === "text"
                ? renderTextPart(part, idx)
                : renderImagePart(part, idx),
            )}
          </View>
          {message.createdAt && (
            <Text className="text-xs text-gray-500 mt-1">
              {formatTime(message.createdAt)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
