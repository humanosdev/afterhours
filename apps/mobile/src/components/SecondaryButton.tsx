import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/** PWA secondary CTA — frosted border pill (`border-white/10 bg-white/5`). */
export function SecondaryButton({ label, onPress, disabled = false }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.base, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: layout.inputRadius,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
  },
  pressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
