import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { surfaceStyles } from "../theme/surfaces";

export type SurfaceVariant = "control" | "field" | "card" | "elevated" | "panel" | "secondaryButton" | "venuePill";

type SurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: SurfaceVariant;
};

/** Solid premium surface — no blur, no sheen. */
export function Surface({ children, style, variant = "control" }: SurfaceProps) {
  return <View style={[surfaceStyles[variant], styles.base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
