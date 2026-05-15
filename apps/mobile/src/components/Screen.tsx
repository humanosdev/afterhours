import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  centered?: boolean;
  style?: ViewStyle;
  /** Use `["top", "left", "right"]` inside tab screens so the bottom tab bar owns the inset. */
  edges?: Edge[];
};

export function Screen({
  children,
  scroll = false,
  centered = false,
  style,
  edges = ["top", "bottom", "left", "right"],
}: ScreenProps) {
  const content = (
    <View style={[styles.inner, centered && styles.centered, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, centered && styles.centered]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        content
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  centered: {
    justifyContent: "center",
  },
});
