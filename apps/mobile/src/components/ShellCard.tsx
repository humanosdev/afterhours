import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Surface } from "./Surface";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type ShellCardProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  style?: ViewStyle;
  /** @deprecated Flat surfaces only — kept for call-site compat. */
  glass?: boolean;
};

export function ShellCard({ title, description, children, style }: ShellCardProps) {
  const body = (
    <>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </>
  );

  return (
    <Surface variant="card" style={[styles.card, style]}>
      {body}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.cardRadius,
    padding: layout.cardGap + 2,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
