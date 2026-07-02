import type { ReactNode, RefObject } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { tabBarScrollInset } from "../shell/tabBarMetrics";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import {
  IntencityRefreshControl,
  type PullRefreshVariant,
} from "./ui/IntencityRefreshControl";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  centered?: boolean;
  style?: ViewStyle;
  edges?: Edge[];
  /** Reserve space for floating tab bar (uses shared `tabBarScrollInset`). */
  tabBarInset?: boolean;
  /** Optional ref for tab re-press scroll-to-top. */
  scrollRef?: RefObject<ScrollView | null>;
  /** Pull-to-refresh when the scroll view is at the top. */
  refreshing?: boolean;
  onRefresh?: () => void;
  refreshVariant?: PullRefreshVariant;
};

export function Screen({
  children,
  scroll = false,
  centered = false,
  style,
  edges = ["top", "bottom", "left", "right"],
  tabBarInset = false,
  scrollRef,
  refreshing = false,
  onRefresh,
  refreshVariant = "default",
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = tabBarInset ? tabBarScrollInset(insets) : 0;

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
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            centered && styles.centered,
            bottomPad > 0 && { paddingBottom: bottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <IntencityRefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                variant={refreshVariant}
              />
            ) : undefined
          }
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
    maxWidth: layout.contentMaxWidth + layout.screenPaddingX * 2,
    width: "100%",
    alignSelf: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: layout.screenPaddingTop,
    paddingBottom: layout.screenPaddingBottom,
    maxWidth: layout.contentMaxWidth + layout.screenPaddingX * 2,
    width: "100%",
    alignSelf: "center",
  },
  centered: {
    justifyContent: "center",
  },
});
