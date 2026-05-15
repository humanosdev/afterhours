import { Platform, StyleSheet } from "react-native";
import { colors } from "./colors";

/** Approximates web `.ah-glass-control` without native blur (Expo Go safe). */
export const glass = StyleSheet.create({
  surface: {
    backgroundColor: "rgba(10, 12, 24, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.42,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  surfaceMuted: {
    backgroundColor: "rgba(27, 32, 40, 0.92)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  iconWell: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  iconWellActive: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  createButton: {
    backgroundColor: "rgba(59, 102, 255, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(59, 102, 255, 0.55)",
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.48,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
});
