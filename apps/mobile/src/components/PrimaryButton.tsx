import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isGhost = variant === "ghost";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isGhost ? styles.ghost : styles.primary,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.textPrimary : colors.textPrimary} />
      ) : (
        <Text style={[styles.label, isGhost && styles.ghostLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    minHeight: 50,
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  ghostLabel: {
    color: colors.textSecondary,
  },
});
