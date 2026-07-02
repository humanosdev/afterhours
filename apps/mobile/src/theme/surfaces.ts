import { StyleSheet } from "react-native";

/** Premium flat surfaces — no blur (BottomNav + Map keep glass separately). */
export const surfaces = {
  appBg: "#0B0E17",
  surface: "#111827",
  surfaceElevated: "#161B2E",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  mutedText: "rgba(255, 255, 255, 0.55)",
  strongText: "#FFFFFF",
  primaryCtaBg: "#FFFFFF",
  primaryCtaText: "#05060A",
} as const;

export const surfaceStyles = StyleSheet.create({
  control: {
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: surfaces.border,
  },
  field: {
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: surfaces.border,
  },
  card: {
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: surfaces.border,
  },
  elevated: {
    backgroundColor: surfaces.surfaceElevated,
    borderWidth: 1,
    borderColor: surfaces.border,
  },
  panel: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: surfaces.border,
  },
  secondaryButton: {
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: surfaces.border,
  },
  venuePill: {
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: surfaces.border,
  },
});
