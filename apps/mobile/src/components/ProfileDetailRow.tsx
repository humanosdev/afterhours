import { Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type ProfileDetailRowProps = {
  label: string;
  value: string;
  mono?: boolean;
  isLast?: boolean;
};

export function ProfileDetailRow({ label, value, mono = false, isLast = false }: ProfileDetailRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[styles.value, mono && styles.valueMono]}
        selectable
        numberOfLines={mono ? 3 : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 3,
    paddingVertical: 9,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  valueMono: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    lineHeight: 18,
  },
});
