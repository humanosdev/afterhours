import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type PhaseBadgeProps = {
  label?: string;
};

export function PhaseBadge({ label = "Phase 2E · Read-only shell" }: PhaseBadgeProps) {
  return (
    <View style={styles.badge}>
      <View style={styles.dot} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentMint,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
});
