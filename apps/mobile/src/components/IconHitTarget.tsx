import type { ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

type IconHitTargetProps = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Icon-only control — no glass well (profile menu, hub heart, back). */
export function IconHitTarget({
  children,
  onPress,
  accessibilityLabel,
  size = 40,
  style,
}: IconHitTargetProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.hit,
        { width: size, height: size, borderRadius: size / 2 },
        style,
        pressed && onPress && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
});
