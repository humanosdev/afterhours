import { StyleSheet, Text, View } from "react-native";
import { TextAction } from "./TextAction";
import { colors } from "../theme/colors";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  prominence?: "hub" | "default";
};

export function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  prominence = "default",
}: SectionHeaderProps) {
  const hub = prominence === "hub";

  return (
    <View style={[styles.row, hub && styles.rowHub]}>
      <Text style={hub ? styles.titleHub : styles.title}>{title}</Text>
      {actionLabel ? (
        onActionPress ? (
          <TextAction label={actionLabel} onPress={onActionPress} />
        ) : (
          <Text style={hub ? styles.actionHub : styles.action}>{actionLabel}</Text>
        )
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
    gap: 8,
  },
  rowHub: {
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.2,
    flex: 1,
  },
  titleHub: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    color: colors.textPrimary,
    flex: 1,
  },
  action: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentActive,
  },
  actionHub: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentActive,
  },
});
