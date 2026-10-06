import { router } from "expo-router";
import { View, Text, Image } from "react-native";
import { useAuth } from "@/contexts/auth";
import GoogleSignInButton from "@/components/google-signin-button";
import AppleSignInButton from "@/components/apple-signin-button";
import { useEffect } from "react";

export default function SignIn() {
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session]);

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 px-8">
      <View className="w-full max-w-sm">
        <View className="items-center mb-12">
          <Image
            source={require("../../assets/splash-icon.png")}
            className="w-full h-48"
            resizeMode="contain"
          />
          <Text
            className="text-2xl text-center text-gray-700"
            style={{ fontFamily: "serif" }}
          >
            Member Login / SignUp
          </Text>
        </View>

        <View>
          <GoogleSignInButton />
          <View className="mt-4">
            <AppleSignInButton />
          </View>
        </View>
      </View>
    </View>
  );
}
