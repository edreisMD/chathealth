import React from "react";
import { TouchableOpacity, Text, Image } from "react-native";
import { useAuth } from "@/contexts/auth";

export default function GoogleSignInBtn() {
  const { signInWithGoogle } = useAuth();

  return (
    <TouchableOpacity
      onPress={signInWithGoogle}
      activeOpacity={0.8}
      className="flex-row items-center justify-center bg-white border border-gray-300 rounded-md px-4 py-3"
    >
      {/* Google logo */}
      <Image
        source={{
          uri: "https://developers.google.com/identity/images/g-logo.png",
        }}
        style={{ width: 22, height: 22 }}
        resizeMode="contain"
      />

      {/* Button label */}
      <Text className="ml-3 text-lg font-medium text-gray-700">
        Continue with Google
      </Text>
    </TouchableOpacity>
  );
}
