import type { ExpoConfig } from "expo/config";

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();

const config: ExpoConfig = {
  name: "Intencity",
  slug: "intencity",
  version: "1.0.0",
  extra: {
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "intencity",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  splash: {
    image: "./assets/hub-logo.png",
    resizeMode: "contain",
    backgroundColor: "#0B0E17",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.intencity.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Allow Intencity to use your location to show where you are on the map.",
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    package: "com.intencity.app",
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0a0c18",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    [
      "expo-splash-screen",
      {
        image: "./assets/hub-logo.png",
        imageWidth: 190,
        resizeMode: "contain",
        backgroundColor: "#0B0E17",
      },
    ],
    "expo-router",
    "expo-dev-client",
    "expo-secure-store",
    "@rnmapbox/maps",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Intencity to access your photos so you can post moments and shares.",
        cameraPermission:
          "Allow Intencity to take photos for moments and shares.",
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission:
          "Allow Intencity to access your photos so you can post moments and shares.",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow Intencity to take photos for moments and shares.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow Intencity to use your location to show where you are on the map.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#3b66ff",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
