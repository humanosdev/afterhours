import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

type ShellCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  style?: ViewStyle;
};

export function ShellCard({ title, description, children, style }: ShellCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
