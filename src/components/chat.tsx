import { v4 as uuidv4 } from "uuid";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { FlatList, Text, TouchableOpacity, View, Keyboard } from "react-native";
import { routes } from "@/lib/routes";
import { KeyboardSpacer } from "@/lib/animations";
import { Composer } from "@/components/composer";
import { ChatMessage } from "@/components/chat-message";
import { AwaitingAgentResponseIndicator } from "@/components/awaiting-agent-response-indicator";
import ChatSuggestions from "@/components/chat-suggestions";

import { authorizedFetch } from "@/lib/api";
import { UIMessage } from "ai";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

interface SelectedImage {
  uri: string;
  id: string;
  type?: string;
  name?: string;
}

interface ChatProps {
  // If provided, the chat will be initialized with the existing conversation. If omitted, a brand-new chat will be started.
  chatId?: string;
  // Pre-fetched messages to populate the chat when an existing chat is opened.
  initialMessages?: UIMessage[];
  // Callback to notify parent component when messages count changes
  onMessagesChange?: (hasMessages: boolean) => void;
}

export default function Chat({
  chatId,
  initialMessages = [],
  onMessagesChange,
}: ChatProps) {
  // Component render log removed for performance

  const router = useRouter();

  // Custom fetch function (AI SDK embeds experimental_attachments in messages automatically)
  const customFetch = async (url: string, options: any) => {
    try {
      const result = await authorizedFetch(url, options);
      return result;
    } catch (error) {
      console.error("Chat: authorizedFetch error:");
      throw error;
    }
  };

  const flatListRef = useRef<FlatList<any>>(null);
  const lastMessageLength = useRef(0);
  const streamingHapticCount = useRef(0);

  // Ensure we always have a valid UUID for chat persistence
  const validChatId = React.useMemo(() => {
    if (
      chatId &&
      typeof chatId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        chatId,
      )
    ) {
      return chatId;
    }
    // Generate a new UUID if chatId is invalid or undefined
    return uuidv4();
  }, [chatId]);

  // ChatId validation log removed for performance

  // No longer need custom tool call tracking - AI SDK handles this through message.parts

  const {
    messages,
    input,
    error,
    status,
    stop,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    append,
  } = useChat({
    id: validChatId, // Always pass a valid UUID
    initialMessages,
    maxSteps: 5, // Enable multi-step tool usage
    fetch: customFetch as unknown as typeof globalThis.fetch,
    onError: (error) => {
      console.error("Chat: useChat error details:");
    },
    onFinish: (message, { finishReason, usage }) => {
      // AI response finish log removed for performance
    },
  });

  // All message update logging removed for performance

  // Helper function to create tool call messages based on tool type
  const createToolCallMessage = (
    toolName: string,
    toolCallId: string,
    state: string,
    isCompleted: boolean,
  ) => {
    const toolCallMessages: { [key: string]: string } = {
      importLabTests: "Importing Lab Tests",
      analyzeLabResults: "Analyzing Lab Tests", // Legacy support
      saveCheckin: "Saving Check-in",
      // Future tools can be added here:
      // 'analyzeImage': 'Analyzing Image',
      // 'generateReport': 'Generating Report',
      // 'processDocument': 'Processing Document'
    };

    return {
      id: `tool-${toolCallId}`,
      role: "assistant" as const,
      content: toolCallMessages[toolName] || `Processing ${toolName}`,
      metadata: {
        isAnalysisStep: true,
        isCompleted,
        toolCallId,
        state,
        toolName,
      },
      createdAt: new Date(),
    };
  };

  // Process messages to include tool call parts (AI SDK format)
  const chatData = React.useMemo(() => {
    // Only log for very small conversations to avoid performance issues
    const shouldLogDetailed = messages.length <= 5;

    // Processing logs removed for performance

    const processedMessages: any[] = [];
    const toolCallStates = new Map<
      string,
      { state: string; isCompleted: boolean; toolName: string }
    >(); // Track tool call states

    // First pass: collect all tool call states (latest state wins)
    messages.forEach((message, messageIndex) => {
      if (message.role === "assistant" && (message as any).parts) {
        (message as any).parts.forEach((part: any) => {
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation?.toolName
          ) {
            const toolCallId = part.toolInvocation.toolCallId;
            const toolName = part.toolInvocation.toolName;
            const state = part.toolInvocation.state;
            const isCompleted = state === "result";

            // Update the state (later states override earlier ones)
            toolCallStates.set(toolCallId, { state, isCompleted, toolName });
          }
        });
      }
    });

    // Tool call state logs removed for performance

    // Determine what tool calls to show based on status and context
    let shouldShowToolCall = false;
    let targetToolCallIds: string[] = [];

    if (status !== "ready") {
      // During streaming: show tool calls (both active and completed)
      // This ensures we show tool call messages even if tools complete quickly
      for (const [toolCallId, state] of toolCallStates) {
        targetToolCallIds.push(toolCallId);
        shouldShowToolCall = true;
      }
    } else {
      // When not streaming: reconstruct tool calls from completed messages for chat history
      // This handles loading saved conversations that contain tool calls
      if (toolCallStates.size > 0) {
        for (const [toolCallId, state] of toolCallStates) {
          if (state.isCompleted) {
            targetToolCallIds.push(toolCallId);
            shouldShowToolCall = true;
          }
        }
      }
    }

    let toolCallMessagesCreated = 0;

    messages.forEach((message, messageIndex) => {
      // If this is an assistant message with parts and we should show tool calls,
      // add tool call messages BEFORE the assistant message for correct chronological order
      if (
        message.role === "assistant" &&
        (message as any).parts &&
        shouldShowToolCall
      ) {
        (message as any).parts.forEach((part: any, partIndex: number) => {
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation?.toolName &&
            targetToolCallIds.includes(part.toolInvocation.toolCallId)
          ) {
            const toolCallId = part.toolInvocation.toolCallId;
            const toolName = part.toolInvocation.toolName;
            const finalState = toolCallStates.get(toolCallId);

            // Check if we've already added a tool call message for this toolCallId globally
            const alreadyAddedGlobally = processedMessages.some(
              (msg) =>
                msg.metadata?.toolCallId === toolCallId &&
                msg.metadata?.isAnalysisStep,
            );

            if (finalState && !alreadyAddedGlobally) {
              toolCallMessagesCreated++;

              // Create a visual tool call message using the helper function
              // During streaming, show as processing; when ready, show as completed
              const isProcessing = status !== "ready";

              const toolCallMessage = createToolCallMessage(
                toolName,
                toolCallId,
                finalState.state,
                !isProcessing, // Show as completed only when not streaming
              );
              processedMessages.push(toolCallMessage);
            }
          }
        });
      }

      // Add the main message AFTER tool calls for correct chronological order
      processedMessages.push(message);
    });

    // Processing summary logs removed for performance

    return processedMessages;
  }, [messages, status]); // Added status dependency to ensure recalculation when status changes

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "user" && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      setShowScrollToBottom(false);
    }
  }, [messages.length]);

  // Auto-scroll during streaming responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      status === "streaming" &&
      flatListRef.current
    ) {
      // Continue auto-scrolling to show new content as it arrives
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [messages, status]);

  // Reset haptic feedback when new conversation starts
  useEffect(() => {
    if (status === "submitted") {
      streamingHapticCount.current = 0;
      lastMessageLength.current = 0;
    }
  }, [status]);

  // Notify parent component when messages count changes (with optimization)
  const [lastHasMessages, setLastHasMessages] = useState(false);
  useEffect(() => {
    const hasAnyMessages = messages.length > 0;
    // Only call callback if the state actually changed
    if (hasAnyMessages !== lastHasMessages) {
      setLastHasMessages(hasAnyMessages);
      onMessagesChange?.(hasAnyMessages);
    }
  }, [messages.length, onMessagesChange, lastHasMessages]);

  // Track streaming message length changes for haptic feedback
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    // Early exit if we've already reached the haptic limit
    if (streamingHapticCount.current >= 8) {
      return;
    }

    if (lastMessage && lastMessage.role === "assistant" && status !== "ready") {
      const currentLength = lastMessage.content?.length || 0;

      // Trigger haptic if message has grown significantly and we haven't reached the limit
      if (currentLength > lastMessageLength.current + 10) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        streamingHapticCount.current += 1;
      }

      lastMessageLength.current = currentLength;
    }
  }, [messages, status]);

  // Handle errors but don't return early (to prevent hooks violation)
  const isCancellationError =
    error &&
    (error.message?.includes("FetchRequestCanceledException") ||
      error.message?.includes("The operation couldn't be completed") ||
      error.message?.includes("Request aborted") ||
      error.message?.includes("Generation stopped") ||
      error.name === "AbortError" ||
      error.message?.includes("aborted") ||
      error.message?.includes("cancelled") ||
      error.message?.includes("canceled"));

  const shouldShowError = error && !isCancellationError;

  // Loading state logs removed for performance

  // Add loading indicator when appropriate - separate from chatData processing
  const finalChatData = React.useMemo(() => {
    const processedData = [...chatData];

    // Show loading indicator only when submitted and no response has started yet
    // Simplified approach: just check status, let the streaming/tool calls naturally hide it
    const shouldShowLoading = status === "submitted";

    // Debug logs removed - loading indicator working correctly

    if (shouldShowLoading) {
      processedData.push({
        id: "loading",
        role: "assistant" as const,
        content: "",
        metadata: { isLoading: true },
      } as any);
    }

    return processedData.reverse(); // Reverse for inverted FlatList
  }, [chatData, status, messages.length]); // Added messages.length to ensure recalculation

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // No rendering logs for performance

    if (item.metadata?.isLoading || item.isLoading) {
      return <AwaitingAgentResponseIndicator />;
    }

    // Analysis messages already have their completion status in metadata
    return <ChatMessage message={item} />;
  };

  const handleSubmitWithAnalysis = useCallback(
    async (images?: SelectedImage[]) => {
      // Get the text content before clearing input
      const textContent =
        input.trim() || (images?.length ? "Image check-in" : "");

      // Don't submit if no content and no images
      if (!textContent && (!images || images.length === 0)) {
        return;
      }

      // Clear input immediately for better UX
      handleInputChange({ target: { value: "" } } as any);

      // Start analysis if we have images (after user message is added)
      const shouldAnalyze = images && images.length > 0;

      if (shouldAnalyze) {
        // Images will be processed by AI SDK tools automatically
        // Image submission log removed for performance
        try {
          // Convert images to base64 format for backend processing with individual error handling
          const attachments = await Promise.allSettled(
            images.map(async (image, index) => {
              try {
                const response = await fetch(image.uri);
                if (!response.ok) {
                  throw new Error(
                    `Failed to fetch image ${index + 1}: ${response.status}`,
                  );
                }

                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = () =>
                    reject(new Error(`Failed to read image ${index + 1}`));
                  reader.readAsDataURL(blob);
                });

                return {
                  name: image.name || `image_${index + 1}.jpg`,
                  contentType: image.type || "image/jpeg",
                  url: base64,
                };
              } catch (error) {
                console.error("ChatHealth: operation status");
                throw error;
              }
            }),
          );

          // Filter out failed images and collect successful ones
          const successfulAttachments = attachments
            .filter(
              (result): result is PromiseFulfilledResult<any> =>
                result.status === "fulfilled",
            )
            .map((result) => result.value);

          const failedCount = attachments.length - successfulAttachments.length;
          if (failedCount > 0) {
            console.warn("ChatHealth: operation status");
          }

          // Only proceed if we have at least one successful image
          if (successfulAttachments.length === 0) {
            throw new Error("All images failed to process");
          }

          // Submit message with successful attachments
          await append({
            role: "user",
            content: textContent,
            experimental_attachments: successfulAttachments,
          });

          // Progress tracking is now handled by backend API updates
        } catch (error) {
          console.error("Error converting images to base64:");
          // Fall back to submitting without images
          const mockEvent = { preventDefault: () => {} } as any;
          originalHandleSubmit(mockEvent);
        }
      } else {
        // Submit text-only message using standard handler
        const mockEvent = { preventDefault: () => {} } as any;
        originalHandleSubmit(mockEvent);
      }
    },
    [
      input,
      handleInputChange,
      append,
      originalHandleSubmit,
      validChatId,
      chatId,
    ],
  );

  // Handle scroll events for scroll-to-bottom button
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    // Dismiss keyboard when user starts scrolling
    Keyboard.dismiss();

    // In inverted lists, 0 is bottom. Show 'scroll-to-bottom' button if scrolled > 50 px away
    if (offsetY > 50) {
      setShowScrollToBottom(true);
    } else {
      setShowScrollToBottom(false);
    }
  };

  // Function to scroll user to the bottom when button tapped.
  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      setShowScrollToBottom(false);
    }
  };

  // Calculate the effective status for the Composer
  // Treat cancellation errors as ready state so submit button works
  const effectiveStatus = isCancellationError ? "ready" : status;

  // Suggestion handling functions
  const handleSuggestionPress = (suggestionText: string) => {
    // Set input immediately for instant feedback
    handleInputChange({ target: { value: suggestionText } } as any);
    // Add haptic feedback for confirmation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNavigateToLifestyle = () => {
    router.push("/lifestyle");
  };

  // Determine if suggestions should be shown
  const shouldShowSuggestions = messages.length === 0 && input.trim() === "";

  // Temporarily disable error UI to debug hooks issue
  // TODO: Re-enable proper error handling after fixing hooks violation
  /*
  if (shouldShowError) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-red-500 text-center">{error?.message || 'An error occurred'}</Text>
      </View>
    );
  }
  */

  return (
    <>
      <View className="flex-1">
        <FlatList
          ref={flatListRef}
          data={finalChatData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          className="flex-1 px-4"
          inverted
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />

        {/* Floating scroll-to-bottom button */}
        {showScrollToBottom && (
          <View className="absolute bottom-0 right-4">
            <TouchableOpacity
              onPress={scrollToBottom}
              className="w-10 h-10 rounded-full bg-gray-50 border border-gray-300 items-center justify-center"
            >
              <Text className="text-black text-xl">↓</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Chat Suggestions */}
      {shouldShowSuggestions && (
        <ChatSuggestions
          onSuggestionPress={handleSuggestionPress}
          onNavigateToLifestyle={handleNavigateToLifestyle}
        />
      )}

      <Composer
        value={input}
        onChangeText={(text: string) =>
          handleInputChange({ target: { value: text } } as any)
        }
        onSubmit={handleSubmitWithAnalysis}
        placeholder="Ask anything"
        status={effectiveStatus}
        onStop={stop}
        autoFocus={true}
      />
      {/* Spacer to push the input above the keyboard */}
      <KeyboardSpacer />
    </>
  );
}
