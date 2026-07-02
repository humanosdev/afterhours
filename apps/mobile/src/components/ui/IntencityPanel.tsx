import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { layout } from "../../theme/layout";
import { surfaces } from "../../theme/surfaces";

type IntencityPanelProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Flat list/card panel — subtle border, no glass. */
export function IntencityPanel({ children, style }: IntencityPanelProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: surfaces.border,
    backgroundColor: surfaces.panel,
    overflow: "hidden",
  },
});
