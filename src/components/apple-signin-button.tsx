import React from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "@/contexts/auth";

export default function AppleSignInButton() {
  const { signInWithApple, isAppleSignInAvailable } = useAuth();

  if (!isAppleSignInAvailable) {
    return null;
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      style={{
        width: "100%",
        height: 48,
      }}
      onPress={signInWithApple}
    />
  );
}
