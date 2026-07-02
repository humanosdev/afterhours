import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** `auth` = PWA white pill; `accent` = brand violet; `ghost` = outline */
  variant?: "auth" | "accent" | "ghost";
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "accent",
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isAuth = variant === "auth";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isAuth && styles.auth,
        !isAuth && !isGhost && styles.accent,
        isGhost && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isAuth ? "#0a0c18" : colors.textPrimary} />
      ) : (
        <Text style={[styles.label, isAuth && styles.authLabel, isGhost && styles.ghostLabel]}>{label}</Text>
      )}
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
  },
  auth: {
    backgroundColor: "#ffffff",
    ...Platform.select({
      ios: {
        shadowColor: "#fff",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 0,
      },
      default: {},
    }),
  },
  accent: {
    backgroundColor: colors.accent,
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
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  authLabel: {
    color: "#000000",
  },
  ghostLabel: {
    color: colors.textSecondary,
  },
});
