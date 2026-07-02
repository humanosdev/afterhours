import { Platform, StyleSheet } from "react-native";
import { colors } from "./colors";

/** Frame + shadow for `.ah-glass-control` — tint/blur applied in `GlassSurface`. */
export const glass = StyleSheet.create({
  surface: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 32,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  /** Bottom nav — single shadow stack (do not duplicate in FloatingTabBar). */
  tabBar: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 32,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  flat: {
    backgroundColor: "rgba(10, 12, 24, 0.72)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  surfaceMuted: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  iconWell: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconWellActive: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  /** `BottomNav` center — `shadow-[0_0_22px_rgba(122,60,255,0.48)]` */
  createButton: {
    backgroundColor: "rgba(59, 102, 255, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(59, 102, 255, 0.55)",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(122, 60, 255, 0.48)",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 22,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
});
