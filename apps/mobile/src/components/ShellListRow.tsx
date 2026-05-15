import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type ShellListRowProps = {
  title: string;
  subtitle: string;
  meta?: string;
  isLast?: boolean;
};

export function ShellListRow({ title, subtitle, meta, isLast = false }: ShellListRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  meta: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
