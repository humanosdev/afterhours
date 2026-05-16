import { Platform, StyleSheet } from "react-native";
import { colors } from "./colors";

/**
 * Approximates web `.ah-glass-control` without blur (Expo Go safe): primary tint, hairline border, softer lift shadow.
 */
export const glass = StyleSheet.create({
  surface: {
    backgroundColor: "rgba(10, 12, 24, 0.72)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  /** Softer fill for dense lists / nested panels — less “card slab”. */
  surfaceMuted: {
    backgroundColor: "rgba(10, 12, 24, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.065)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {},
    }),
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
