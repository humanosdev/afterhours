import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type ShellListRowProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  isLast?: boolean;
};

export function ShellListRow({ title, subtitle, meta, isLast = false }: ShellListRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    gap: 10,
    paddingVertical: layout.rowPaddingY,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  meta: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
