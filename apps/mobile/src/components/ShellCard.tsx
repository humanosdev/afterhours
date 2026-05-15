import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type ShellCardProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  style?: ViewStyle;
  glass?: boolean;
};

export function ShellCard({ title, description, children, style, glass: useGlass = true }: ShellCardProps) {
  const body = (
    <>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </>
  );

  if (useGlass) {
    return (
      <GlassSurface style={[styles.card, style]} muted>
        {body}
      </GlassSurface>
    );
  }

  return <View style={[styles.cardSolid, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.cardRadius,
    padding: 12,
    gap: 8,
  },
  cardSolid: {
    borderRadius: layout.cardRadius,
    padding: 12,
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
