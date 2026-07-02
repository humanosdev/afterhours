import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Pressable } from "react-native";
import { GlassSurface } from "../GlassSurface";
import { colors } from "../../theme/colors";

type MapGlassPillProps = {
  onPress?: () => void;
  active?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** PWA `inline-flex items-center gap-1` control pill. */
export function MapGlassPill({ onPress, active = false, children, style, accessibilityLabel }: MapGlassPillProps) {
  const body = (
    <GlassSurface preset="control" style={[styles.pill, active && styles.pillActiveBorder, style]} sheen>
      <View style={styles.row}>{children}</View>
    </GlassSurface>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {body}
    </Pressable>
  );
}

/** Single-line label beside icon — `text-[11px] font-semibold`. */
export function MapGlassPillLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillActiveBorder: {
    borderColor: "rgba(59, 102, 255, 0.55)",
    backgroundColor: "rgba(59, 102, 255, 0.3)",
    shadowColor: "rgba(59, 102, 255, 0.32)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite85,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.92,
  },
});
