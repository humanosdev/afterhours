import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  /** Web hub section titles (`text-[15px] font-semibold text-white`). */
  prominence?: "hub" | "default";
};

export function SectionHeader({ title, actionLabel, prominence = "default" }: SectionHeaderProps) {
  const hub = prominence === "hub";
  return (
    <View style={[styles.row, hub && styles.rowHub]}>
      <Text style={hub ? styles.titleHub : styles.title}>{title}</Text>
      {actionLabel ? (
        <Text style={hub ? styles.actionHub : styles.action}>{actionLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  rowHub: {
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  titleHub: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    color: colors.textPrimary,
  },
  action: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentActive,
  },
  actionHub: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textWhite78,
  },
});
