import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

type TextActionProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Hub section actions use slightly brighter white-blue. */
  tone?: "accent" | "muted";
};

/** Minimal text CTA — no glass pill. */
export function TextAction({ label, onPress, disabled, tone = "accent" }: TextActionProps) {
  const labelStyle = tone === "muted" ? styles.labelMuted : styles.labelAccent;

  if (!onPress) {
    return <Text style={labelStyle}>{label}</Text>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labelAccent: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentActive,
  },
  labelMuted: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textWhite78,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
});
