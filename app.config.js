// Deployment-specific identifiers belong in the local environment.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleScheme = iosClientId
    ? `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, "")}`
    : undefined;
  return {
    ...config,
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    ios: {
      ...config.ios,
      bundleIdentifier:
        process.env.IOS_BUNDLE_IDENTIFIER || config.ios.bundleIdentifier,
      ...(process.env.APP_LINK_DOMAIN
        ? { associatedDomains: [`applinks:${process.env.APP_LINK_DOMAIN}`] }
        : {}),
    },
    android: {
      ...config.android,
      package: process.env.ANDROID_PACKAGE || config.android.package,
    },
    plugins: [
      ...config.plugins,
      ...(googleScheme
        ? [
            [
              "@react-native-google-signin/google-signin",
              { iosUrlScheme: googleScheme },
            ],
          ]
        : []),
    ],
    extra: {
      ...config.extra,
      ...(process.env.EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
        : {}),
    },
  };
};
