import React from "react";
import { View, Image, Text } from "react-native";
import { MarkdownComponent } from "./markdown";
import { UIMessage } from "ai";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

// Enhanced animated text component for analysis steps with shimmer effect
function AnimatedAnalysisText({
  text,
  isCompleted,
}: {
  text: string;
  isCompleted: boolean;
}) {
  const shimmerX = useSharedValue(-100);

  React.useEffect(() => {
    if (!isCompleted) {
      // Shimmer effect - moving highlight from left to right
      shimmerX.value = withRepeat(
        withTiming(150, {
          duration: 1500, // Back to better previous speed
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false,
      );
    } else {
      // Stop animation when completed
      shimmerX.value = withTiming(-100, { duration: 300 });
    }
  }, [isCompleted]);

  const shimmerStyle = useAnimatedStyle(() => {
    if (isCompleted) {
      return {
        opacity: 0,
        transform: [{ translateX: -100 }],
      };
    }

    return {
      transform: [{ translateX: shimmerX.value }],
      opacity: 0.6,
    };
  });

  if (isCompleted) {
    // When completed, show dimmed text without shimmer using same font as assistant messages
    return (
      <View style={{ alignSelf: "flex-start", opacity: 0.7 }}>
        <MarkdownComponent>{text}</MarkdownComponent>
      </View>
    );
  }

  // When processing, show text with shimmer overlay using same font as assistant messages
  return (
    <View style={{ alignSelf: "flex-start", position: "relative" }}>
      {/* Base text using same styling as assistant messages */}
      <MarkdownComponent>{text}</MarkdownComponent>

      {/* Moving shimmer overlay with gradient effect */}
      <Animated.View
        style={[
          shimmerStyle,
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 100,
            borderRadius: 0,
          },
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(243, 244, 246, 0.2)", // Transparent at left edge
            "rgba(243, 244, 246, 1)", // Background color with 80% opacity in center
            "rgba(243, 244, 246, 0.2)", // Transparent at right edge
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flex: 1,
            borderRadius: 0,
          }}
        />
      </Animated.View>
    </View>
  );
}

export function ChatMessage({
  message,
}: {
  message: UIMessage & { metadata?: any; toolInvocations?: any[] };
}) {
  const isUser = message.role === "user";
  const isAnalysisStep = message.metadata?.isAnalysisStep;
  const isCompleted = message.metadata?.isCompleted ?? true;
  const isLoading = message.metadata?.isLoading;

  // Check if this message has tool calls (AI SDK format)
  const hasToolCalls =
    message.toolInvocations && message.toolInvocations.length > 0;

  const renderPart = (part: any, idx: number) => {
    if (part.type === "text") {
      return <MarkdownComponent key={idx}>{part.text}</MarkdownComponent>;
    } else if (part.type === "image") {
      return (
        <Image
          key={idx}
          source={{ uri: part.image }}
          className="w-48 h-48 rounded-lg mt-2"
          resizeMode="cover"
        />
      );
    }
    return null;
  };

  const renderAttachment = (attachment: any, idx: number) => {
    if (
      attachment.contentType === "image" ||
      attachment.contentType?.startsWith("image/")
    ) {
      return (
        <Image
          key={`attachment-${idx}`}
          source={{ uri: attachment.url }}
          className="w-48 h-48 rounded-lg mb-2"
          resizeMode="cover"
        />
      );
    }

    return null;
  };

  const renderToolCall = (toolCall: any, idx: number) => {
    if (
      toolCall.toolName === "importLabTests" ||
      toolCall.toolName === "analyzeLabResults"
    ) {
      const displayText =
        toolCall.toolName === "importLabTests"
          ? "Importing Lab Tests"
          : "Analyzing Lab Tests";
      return (
        <AnimatedAnalysisText
          key={`tool-${idx}`}
          text={displayText}
          isCompleted={toolCall.state === "result"}
        />
      );
    } else if (toolCall.toolName === "saveCheckin") {
      return (
        <AnimatedAnalysisText
          key={`tool-${idx}`}
          text="Saving Check-in"
          isCompleted={toolCall.state === "result"}
        />
      );
    }

    return null;
  };

  // If this is just a loading indicator
  if (isLoading) {
    return null; // Will be handled by AwaitingAgentResponseIndicator
  }

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
        // User message with images outside
        <View className="max-w-[80%] items-end">
          {/* Render images outside and above the message bubble */}
          {message.experimental_attachments?.map(
            (attachment: any, idx: number) => renderAttachment(attachment, idx),
          )}

          {/* Render image parts outside the message bubble */}
          {message.parts?.map((part: any, idx: number) =>
            renderImagePart(part, idx),
          )}

          {/* Message bubble with only text content */}
          {((message.parts &&
            message.parts.some((p: any) => p.type === "text")) ||
            (!message.parts && message.content)) && (
            <View className="bg-[#EFEFEF] px-4 py-2 rounded-3xl">
              {/* Render only text parts */}
              {message.parts?.map((part: any, idx: number) =>
                renderTextPart(part, idx),
              )}

              {/* Render content if no parts */}
              {(!message.parts || message.parts.length === 0) &&
                message.content && (
                  <MarkdownComponent>{message.content}</MarkdownComponent>
                )}
            </View>
          )}
        </View>
      ) : (
        // Agent message (including analysis steps and tool calls)
        <View>
          {/*
            DISABLED: Tool calls are now handled by chat.tsx processing logic to avoid duplicates
            Previously this was creating duplicate "Analyzing Lab Tests" messages
            because both ChatMessage and chat.tsx were independently rendering tool calls
          */}
          {/* {hasToolCalls && message.toolInvocations?.map((toolCall, idx) => renderToolCall(toolCall, idx))} */}

          {isAnalysisStep ? (
            // Analysis step with animated text
            <AnimatedAnalysisText
              text={message.content}
              isCompleted={isCompleted}
            />
          ) : (
            // Regular assistant message
            <>
              {message.parts?.map((part: any, idx: number) =>
                renderPart(part, idx),
              )}

              {/* Render content if no parts */}
              {(!message.parts || message.parts.length === 0) &&
                message.content && (
                  <MarkdownComponent>{message.content}</MarkdownComponent>
                )}
            </>
          )}
        </View>
      )}
    </View>
  );
}
