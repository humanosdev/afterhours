import type { ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Surface } from "./Surface";
import { layout } from "../theme/layout";

type GlassPillProps = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** @deprecated Prefer `TextAction` for text CTAs. Flat surface pill when a chip is required. */
export function GlassPill({ children, onPress, disabled, style }: GlassPillProps) {
  const inner = (
    <Surface variant="control" style={[styles.pill, style]}>
      {children}
    </Surface>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [pressed && !disabled && styles.pressed, disabled && styles.disabled]}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: layout.pillRadius,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
