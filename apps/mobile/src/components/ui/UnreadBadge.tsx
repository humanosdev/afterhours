import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";

type UnreadBadgeProps = {
  count: number;
  style?: object;
};

/** PWA hub heart / chat tab count pill. */
export function UnreadBadge({ count, style }: UnreadBadgeProps) {
  if (count <= 0) return null;
  const label = count > 9 ? "9+" : String(count);
  return (
    <View style={[styles.badge, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    lineHeight: 12,
  },
});
