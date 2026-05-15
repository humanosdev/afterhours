import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  centered?: boolean;
  style?: ViewStyle;
  /** Use `["top", "left", "right"]` inside tab screens so the floating tab bar owns the inset. */
  edges?: Edge[];
  /** Extra bottom padding when using the floating tab bar. */
  tabBarInset?: boolean;
};

export function Screen({
  children,
  scroll = false,
  centered = false,
  style,
  edges = ["top", "bottom", "left", "right"],
  tabBarInset = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = tabBarInset ? layout.tabBarClearance + Math.max(insets.bottom, 8) : 0;

  const contentStyle = [
    styles.inner,
    centered && styles.centered,
    bottomPad > 0 && { paddingBottom: bottomPad },
    style,
  ];

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, centered && styles.centered, bottomPad > 0 && { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  inner: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: layout.screenPaddingTop,
    paddingBottom: layout.screenPaddingBottom,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: layout.screenPaddingTop,
    paddingBottom: layout.screenPaddingBottom,
  },
  centered: {
    justifyContent: "center",
  },
});
