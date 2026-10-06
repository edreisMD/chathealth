import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Keyboard,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { routes } from "@/lib/routes";
import Feather from "react-native-vector-icons/Feather";
import { supabase } from "@/lib/supabase";

interface SelectedImage {
  uri: string;
  id: string;
  type?: string;
  name?: string;
}

interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (images?: SelectedImage[]) => void;
  placeholder?: string;
  status?: "ready" | "submitted" | "streaming" | "error";
  onStop?: () => void;
  autoFocus?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder = "Type a message...",
  status = "ready",
  onStop,
  autoFocus = false,
}) => {
  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // Image attachment state
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [showImageOptions, setShowImageOptions] = useState(false);

  // Local state to track if stop has been clicked for immediate UI feedback
  const [isStopClicked, setIsStopClicked] = useState(false);

  // Animation for recording pulse - use useRef instead of useState
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // TextInput ref for focusing
  const textInputRef = useRef<TextInput>(null);

  // Handle auto-focus
  useEffect(() => {
    if (autoFocus && textInputRef.current) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Reset stop clicked state when status changes back to ready
  useEffect(() => {
    if (status === "ready") {
      setIsStopClicked(false);
    }
  }, [status]);

  // Start pulsing animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isRecording) pulse();
        });
      };
      pulse();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const handleSubmit = () => {
    if ((value.trim() || selectedImages.length > 0) && status === "ready") {
      Keyboard.dismiss();
      onSubmit(selectedImages.length > 0 ? selectedImages : undefined);
      // Clear images after submission
      setSelectedImages([]);
    }
  };

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== "granted") {
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert(
        "Error",
        "Failed to start recording. Please check microphone permissions.",
      );
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();

      if (uri) {
        await transcribeAudio(uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to stop recording");
    } finally {
      setRecording(null);
      setIsTranscribing(false);
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      // Use FileSystem.uploadAsync for proper file upload in React Native
      const uploadResult = await authorizedUploadAsync(audioUri);

      if (uploadResult.status === 200) {
        const result = JSON.parse(uploadResult.body);

        if (result.success && result.text) {
          // Fill the text input with transcribed text (like ChatGPT)
          onChangeText(result.text);
        } else {
          Alert.alert("Error", "Failed to transcribe audio. Please try again.");
        }
      } else {
        Alert.alert("Error", "Failed to upload audio. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to transcribe audio. Please try again.");
    }
  };

  const handleVoicePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Image picker functions
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    return {
      camera: cameraPermission.status === "granted",
      mediaLibrary: mediaLibraryPermission.status === "granted",
    };
  };

  const handleCamera = async () => {
    setShowImageOptions(false);

    const permissions = await requestPermissions();
    if (!permissions.camera) {
      Alert.alert(
        "Permission denied",
        "Camera permission is required to take photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newImage: SelectedImage = {
        uri: result.assets[0].uri,
        id: Date.now().toString(),
        type: result.assets[0].type,
        name: result.assets[0].fileName || "camera-photo.jpg",
      };
      setSelectedImages([...selectedImages, newImage]);
    }
  };

  const handlePhotos = async () => {
    setShowImageOptions(false);

    const permissions = await requestPermissions();
    if (!permissions.mediaLibrary) {
      Alert.alert(
        "Permission denied",
        "Photo library permission is required to select photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newImages: SelectedImage[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        id: `${Date.now()}-${index}`,
        type: asset.type,
        name: asset.fileName || `photo-${index}.jpg`,
      }));
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };

  const removeImage = (imageId: string) => {
    const updatedImages = selectedImages.filter((img) => img.id !== imageId);
    setSelectedImages(updatedImages);
  };

  const isSubmitDisabled =
    (!value.trim() && selectedImages.length === 0) || status !== "ready";
  const isGenerating =
    (status === "submitted" || status === "streaming") && !isStopClicked;

  return (
    <View className="mx-4 my-2">
      <View className="bg-gray-100 border border-gray-300 rounded-3xl">
        {/* Image Previews inside the container */}
        {selectedImages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 pt-3"
          >
            {selectedImages.map((image) => (
              <View key={image.id} className="relative mr-2">
                <Image
                  source={{ uri: image.uri }}
                  className="w-16 h-16 rounded-lg"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => removeImage(image.id)}
                  className="absolute -top-1 -right-1 bg-gray-800 rounded-full w-5 h-5 items-center justify-center"
                >
                  <Feather name="x" size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Text input area */}
        <View className="px-4 py-2">
          <TextInput
            ref={textInputRef}
            placeholder={
              isRecording
                ? "Listening..."
                : isTranscribing
                  ? "Transcribing..."
                  : placeholder
            }
            className="text-xl min-h-[40px] placeholder:text-gray-400"
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={handleSubmit}
            autoFocus={autoFocus}
            multiline={true}
            numberOfLines={4}
            scrollEnabled={false}
            keyboardAppearance="light"
            editable={
              !isRecording &&
              !isTranscribing &&
              status !== "submitted" &&
              status !== "streaming"
            }
          />
        </View>

        {/* Bottom row with controls */}
        <View className="flex-row items-center justify-between px-3 pb-2">
          {/* Plus button */}
          <TouchableOpacity
            onPress={() => setShowImageOptions(true)}
            disabled={
              isRecording ||
              isTranscribing ||
              status === "submitted" ||
              status === "streaming"
            }
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <Feather
              name="plus"
              size={26}
              color={
                isRecording ||
                isTranscribing ||
                status === "submitted" ||
                status === "streaming"
                  ? "#9CA3AF"
                  : "#000000"
              }
            />
          </TouchableOpacity>

          {/* Voice and Send buttons */}
          <View className="flex-row items-center">
            {/* Microphone button */}
            {isRecording ? (
              /* Recording state - pulsing black button */
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim }],
                }}
              >
                <TouchableOpacity
                  onPress={handleVoicePress}
                  className="w-9 h-9 rounded-full items-center justify-center bg-black mr-2"
                >
                  {/* Stop icon (square) */}
                  <View className="w-3 h-3 bg-white rounded-sm" />
                </TouchableOpacity>
              </Animated.View>
            ) : isTranscribing ? (
              /* Loading spinner during transcription */
              <View className="w-9 h-9 items-center justify-center mr-2">
                <ActivityIndicator size="small" color="#666" />
              </View>
            ) : (
              /* Normal microphone button - just the icon, no background */
              <TouchableOpacity
                onPress={handleVoicePress}
                className="w-9 h-9 items-center justify-center mr-2"
              >
                <Feather name="mic" size={22} color="#000000" />
              </TouchableOpacity>
            )}

            {/* Send/Stop button */}
            {isGenerating ? (
              /* Stop button - black background */
              <TouchableOpacity
                onPress={() => {
                  setIsStopClicked(true); // Immediately update UI
                  try {
                    onStop?.();
                  } catch (error) {
                    // Silently handle any stop errors
                  }
                }}
                className="w-11 h-11 rounded-full items-center justify-center bg-black"
              >
                {/* Stop icon (square) */}
                <View className="w-3 h-3 bg-white rounded-sm" />
              </TouchableOpacity>
            ) : (
              /* Send button - always active (black) like ChatGPT */
              <TouchableOpacity
                onPress={handleSubmit}
                className="w-11 h-11 rounded-full items-center justify-center bg-black"
                disabled={isSubmitDisabled}
              >
                <Text className="font-semibold text-2xl text-white">↑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Image Options Modal */}
      {/* ChatGPT-style popup above plus button */}
      {showImageOptions && (
        <>
          {/* Invisible overlay to capture outside taps - covers entire screen */}
          <TouchableOpacity
            className="absolute inset-0 z-10"
            activeOpacity={1}
            onPress={() => setShowImageOptions(false)}
            style={{
              position: "absolute",
              top: -200, // Extend beyond composer bounds
              left: -200,
              right: -200,
              bottom: -200,
            }}
          />

          {/* Popup positioned above plus button */}
          <View
            className="absolute bottom-14 left-3 z-20 bg-white rounded-xl border border-gray-200 overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 8, // Android shadow
              minWidth: 200,
            }}
          >
            {/* Camera Option */}
            <TouchableOpacity
              onPress={handleCamera}
              className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100"
            >
              <Text className="text-lg font-semibold text-gray-900">
                Camera
              </Text>
              <Feather name="camera" size={20} color="#374151" />
            </TouchableOpacity>

            {/* Photos Option */}
            <TouchableOpacity
              onPress={handlePhotos}
              className="flex-row items-center justify-between px-6 py-4"
            >
              <Text className="text-lg font-semibold text-gray-900">
                Photos
              </Text>
              <Feather name="image" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

async function authorizedUploadAsync(fileUri: string) {
  // 1. Get tokens the same way authorizedFetch() does
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No auth session");
  }

  // 2. Pass them in the `headers` field
  return FileSystem.uploadAsync(routes.transcribe, fileUri, {
    fieldName: "audio",
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "x-refresh-token": session.refresh_token ?? "",
    },
  });
}
