import React, { useState, useRef, useEffect } from "react";
import { authorizedFetch } from "@/lib/api";
import {
  FlatList,
  Text,
  SafeAreaView,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { routes } from "@/lib/routes";
import { KeyboardSpacer } from "@/lib/animations";
import { Composer } from "@/components/composer";
import { CheckinMessage } from "@/components/checkin-message";
import { UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHECKIN_CACHE_KEY = "checkin_history_cache";
const ITEMS_PER_PAGE = 10;

export default function Checkins() {
  // Ref for controlling scroll position
  const listRef = useRef<FlatList<any>>(null);

  // Simple state management (no AI SDK needed for checkins)
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination state
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);

  const handleInputChange = (text: string) => {
    setInput(text);
  };

  // Cache management functions
  const loadCachedCheckins = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CHECKIN_CACHE_KEY);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          // Filter out any cached messages with invalid local URIs
          const validCachedData = parsedData.map((message) => {
            if (message.parts) {
              const validParts = message.parts.filter((part: any) => {
                // Keep text parts and image parts with valid remote URLs
                if (part.type === "text") return true;
                if (part.type === "image" && part.image) {
                  // Only keep images with remote URLs (http/https), not local URIs
                  return part.image.startsWith("http");
                }
                return false;
              });
              return { ...message, parts: validParts };
            }
            return message;
          });

          setMessages(validCachedData);
          console.log("Checkins: Loaded cached data:");
          return true;
        }
      }
      return false;
    } catch (err) {
      console.log("Checkins: Failed to load cached data:");
      return false;
    }
  };

  const saveCheckinsToCache = async (checkinData: UIMessage[]) => {
    try {
      // Only cache the most recent items to keep storage light
      const itemsToCache = checkinData.slice(0, ITEMS_PER_PAGE * 2); // Cache 20 items max
      await AsyncStorage.setItem(
        CHECKIN_CACHE_KEY,
        JSON.stringify(itemsToCache),
      );
      console.log("Checkins: Cached");
    } catch (err) {
      console.log("Checkins: Failed to cache data:");
    }
  };

  // Transform database rows to UIMessage format
  const transformCheckinData = (rows: any[]): UIMessage[] => {
    return rows.map((row: any) => {
      let parts: any[] = [];
      try {
        parts =
          typeof row.parts === "string" ? JSON.parse(row.parts) : row.parts;
      } catch {
        parts = [];
      }
      // Extract text from part objects for content property
      const textContent = Array.isArray(parts)
        ? parts
            .map((p: any) =>
              typeof p === "object" && p?.type === "text" ? p.text : "",
            )
            .join("\n")
        : "";

      return {
        id: row.checkinId || String(Date.now()),
        role: "user",
        content: textContent,
        parts: Array.isArray(parts)
          ? parts
          : [{ type: "text", text: textContent }],
        createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
      };
    });
  };

  // Fetch checkins with pagination
  const fetchCheckins = async (
    offset: number = 0,
    isLoadMore: boolean = false,
    isBackgroundRefresh: boolean = false,
  ) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else if (isBackgroundRefresh) {
        setBackgroundLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = `${routes.checkin}?limit=${ITEMS_PER_PAGE}&offset=${offset}`;
      console.log("Checkins: Fetching from:");

      const res = await authorizedFetch(url);
      if (!res.ok) throw new Error(`Failed to load check-ins (${res.status})`);

      const data = await res.json();
      console.log("Checkins: Fetched");

      // API should return newest first (DESC order), no need to reverse
      const rows = Array.isArray(data) ? data : [];
      const newCheckins = transformCheckinData(rows);

      if (isLoadMore) {
        // Append older messages to the end (they go to top in inverted FlatList)
        setMessages((prevMessages) => [...newCheckins, ...prevMessages]);
        setCurrentOffset(offset + ITEMS_PER_PAGE);
      } else {
        // Replace messages (fresh data) - newest appear at bottom in inverted FlatList
        setMessages(newCheckins);
        setCurrentOffset(ITEMS_PER_PAGE);
        // Cache the fresh data
        saveCheckinsToCache(newCheckins);
      }

      // Check if we have more data
      setHasMoreData(newCheckins.length === ITEMS_PER_PAGE);

      console.log("Checkins: Updated state with");
    } catch (err) {
      console.error("Checkins: Failed to fetch:");
      if (!isBackgroundRefresh) {
        setError(
          err instanceof Error ? err : new Error("Failed to load checkins"),
        );
      }
    } finally {
      if (isBackgroundRefresh) {
        setBackgroundLoading(false);
      } else {
        setLoading(false);
      }
      setLoadingMore(false);
    }
  };

  // Load more checkins (older ones)
  const loadMoreCheckins = async () => {
    if (loadingMore || !hasMoreData) return;
    await fetchCheckins(currentOffset, true);
  };

  // Handle checkin submission (instant UI, background upload)
  const handleSubmit = async (images?: any[]) => {
    const trimmed = input.trim();
    if (!trimmed && (!images || images.length === 0)) return;
    if (isSubmitting) return;

    console.log("Checkins: handleSubmit called with");
    setIsSubmitting(true);

    try {
      const messageId = uuidv4();
      const textContent =
        trimmed || (images && images.length > 0 ? "Image check-in" : "");

      // Step 1: Show optimistic message IMMEDIATELY with local image URIs
      const optimisticParts: any[] = [];
      if (textContent) {
        optimisticParts.push({ type: "text", text: textContent });
      }
      if (images && images.length > 0) {
        images.forEach((image) => {
          optimisticParts.push({
            type: "image",
            image: image.uri, // Use local URI for instant display
            name: image.name || "image.jpg",
            contentType: image.type || "image/jpeg",
          });
        });
      }

      const optimisticMessage: UIMessage = {
        id: messageId,
        role: "user",
        content: textContent,
        createdAt: new Date(),
        parts: optimisticParts,
      } as UIMessage;

      // Show immediately (instant UX) - add to beginning so it appears at bottom in inverted FlatList
      setMessages((prev) => [optimisticMessage, ...prev]);
      setInput("");
      console.log("Checkins: Optimistic message added instantly");

      // Don't cache optimistic message with local URIs - wait for final URLs

      // Step 2: Upload images in background (if any)
      let finalAttachments: any[] = [];
      if (images && images.length > 0) {
        console.log("Checkins: Starting background image uploads...");

        finalAttachments = await Promise.all(
          images.map(async (image, index) => {
            console.log("ChatHealth: operation status");

            try {
              // Get presigned upload URL from backend
              const presignedResponse = await authorizedFetch(
                routes.presignedUpload,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fileName: image.name || "image.jpg",
                    contentType: image.type || "image/jpeg",
                  }),
                },
              );

              if (!presignedResponse.ok) {
                throw new Error(
                  `Failed to get presigned URL: ${presignedResponse.status}`,
                );
              }

              const { signedUrl, publicUrl } = await presignedResponse.json();

              // Upload image directly to Supabase using presigned URL
              const imageBlob = await fetch(image.uri).then((res) =>
                res.blob(),
              );

              const uploadResponse = await fetch(signedUrl, {
                method: "PUT",
                body: imageBlob,
                headers: {
                  "Content-Type": image.type || "image/jpeg",
                },
              });

              if (!uploadResponse.ok) {
                throw new Error(
                  `Failed to upload image: ${uploadResponse.status}`,
                );
              }

              console.log("ChatHealth: operation status");

              return {
                name: image.name || "image.jpg",
                contentType: image.type || "image/jpeg",
                url: publicUrl, // Small Supabase URL for backend
              };
            } catch (error) {
              console.error("ChatHealth: operation status");
              throw error;
            }
          }),
        );

        console.log(
          "Checkins: All images uploaded, updating optimistic message with Supabase URLs",
        );

        // Step 3: Update optimistic message with final Supabase URLs
        const finalParts: any[] = [];
        if (textContent) {
          finalParts.push({ type: "text", text: textContent });
        }
        finalAttachments.forEach((attachment) => {
          finalParts.push({
            type: "image",
            image: attachment.url, // Now using Supabase URL
            name: attachment.name,
            contentType: attachment.contentType,
          });
        });

        // Update the optimistic message with final URLs
        setMessages((prev) => {
          const updatedMessages = prev.map((msg) =>
            msg.id === messageId ? { ...msg, parts: finalParts } : msg,
          );

          // Update cache with final URLs (now safe to cache)
          saveCheckinsToCache(updatedMessages);
          console.log("Checkins: Updated cache with final image URLs");

          return updatedMessages;
        });
      } else {
        // No images - safe to cache text-only message immediately
        updateCacheWithNewCheckin(optimisticMessage);
        console.log("Checkins: Cached text-only checkin immediately");
      }

      // Step 4: Submit to server with final data
      const finalMessage: UIMessage = {
        id: messageId,
        role: "user",
        content: textContent,
        createdAt: new Date(),
        parts:
          finalAttachments.length > 0
            ? [
                ...optimisticParts.filter((p) => p.type === "text"),
                ...finalAttachments.map((a) => ({
                  type: "image",
                  image: a.url,
                  name: a.name,
                  contentType: a.contentType,
                })),
              ]
            : optimisticParts,
        experimental_attachments: finalAttachments,
      } as UIMessage;

      console.log("Checkins: Submitting to server...");
      const response = await authorizedFetch(routes.checkin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: finalMessage }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Checkins: Server error:");
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Checkins: Successfully saved checkin:");
    } catch (error) {
      console.error("Checkins: Failed to save check-in:");
      setError(
        error instanceof Error ? error : new Error("Failed to save check-in"),
      );

      // TODO: Could remove optimistic message or show error state
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new checkin to cache when submitted
  const updateCacheWithNewCheckin = async (newCheckin: UIMessage) => {
    try {
      const cachedData = await AsyncStorage.getItem(CHECKIN_CACHE_KEY);
      const existingCache = cachedData ? JSON.parse(cachedData) : [];
      // Add new checkin to the beginning (newest first) and limit cache size
      const updatedCache = [newCheckin, ...existingCache].slice(
        0,
        ITEMS_PER_PAGE * 2,
      );
      await AsyncStorage.setItem(
        CHECKIN_CACHE_KEY,
        JSON.stringify(updatedCache),
      );
      console.log("Checkins: Updated cache with new checkin");
    } catch (err) {
      console.log("Checkins: Failed to update cache with new checkin:");
    }
  };

  // Helper to format date labels (Today, Yesterday, or full date)
  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  /**
   * Build a flat list of items that includes date separators.
   * Each entry is either `{ type: 'date', date: Date }` or
   * `{ type: 'message', message: UIMessage }`.
   *
   * For inverted FlatList, we need to process messages in chronological order
   * and then reverse the final items array so date labels appear correctly.
   */
  const displayItems = React.useMemo(() => {
    type DisplayItem =
      | { type: "date"; date: Date }
      | { type: "message"; message: UIMessage };

    const items: DisplayItem[] = [];
    let lastDateKey = "";

    // Process messages in chronological order (oldest to newest) for proper date grouping
    const chronologicalMessages = [...messages].reverse();

    chronologicalMessages.forEach((msg) => {
      if (msg.createdAt) {
        const date = new Date(msg.createdAt);
        const dateKey = date.toDateString();
        if (dateKey !== lastDateKey) {
          items.push({ type: "date", date });
          lastDateKey = dateKey;
        }
      }
      items.push({ type: "message", message: msg });
    });

    // Reverse items array for inverted FlatList so dates appear above their message groups
    return items.reverse();
  }, [messages]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === "date") {
      return (
        <Text className="text-sm text-gray-500 text-center my-4">
          {formatDateLabel(item.date)}
        </Text>
      );
    }

    return <CheckinMessage message={item.message} />;
  };

  // Auto-scroll whenever a new message is added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages.length]);

  // Load cached data first, then fetch fresh data
  useEffect(() => {
    const loadData = async () => {
      // Load cached data immediately
      const hasCachedData = await loadCachedCheckins();

      if (hasCachedData) {
        // If we have cached data, set loading to false and fetch fresh data in background
        setLoading(false);
        fetchCheckins(0, false, true); // Background refresh
      } else {
        // If no cached data, fetch fresh data normally
        await fetchCheckins();
      }
    };

    loadData();
  }, []);

  if (error && messages.length === 0) {
    return (
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center">
          <Text className="text-red-500 px-4 py-2 text-center">
            {error.message}
          </Text>
          <TouchableOpacity
            onPress={() => fetchCheckins()}
            className="mt-4 px-4 py-2 bg-black rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6B7280" />
          <Text className="text-gray-600 mt-2">Loading check-ins...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Load more footer component
  const renderLoadMoreFooter = () => {
    if (!hasMoreData && !loadingMore) {
      return (
        <View className="py-4 items-center">
          <Text className="text-gray-500 text-sm">No more check-ins</Text>
        </View>
      );
    }

    if (loadingMore) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#6B7280" />
          <Text className="text-gray-600 text-sm mt-2">Loading more...</Text>
        </View>
      );
    }

    if (hasMoreData) {
      return (
        <View className="py-4 items-center">
          <TouchableOpacity
            onPress={loadMoreCheckins}
            className="px-4 py-2 bg-gray-100 rounded-lg"
          >
            <Text className="text-gray-700 font-medium">Load More</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView className="flex-1">
      <FlatList
        ref={listRef}
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={(item: any, index) => {
          if (item.type === "date") {
            return `date-${item.date.toDateString()}`;
          }
          return item.message.id || `message-${index}`;
        }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        className="flex-1 px-4"
        inverted
        ListFooterComponent={renderLoadMoreFooter}
      />
      <Composer
        value={input}
        onChangeText={handleInputChange}
        onSubmit={handleSubmit}
        placeholder="Record anything"
      />
      {/* Spacer to push the input above the keyboard */}
      <KeyboardSpacer />
    </SafeAreaView>
  );
}
