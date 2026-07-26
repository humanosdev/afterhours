import type { ReactNode, RefObject } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import type { Edge } from "react-native-safe-area-context";
import { layoutInsets, layoutSafeAreaPadding } from "../theme/layoutInsets";
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
  /** Tab chrome pinned above the scroll body — prevents cold-open reflow from shifting headers. */
  fixedHeader?: ReactNode;
  /** Reserve space for floating tab bar (uses shared `tabBarScrollInset`). */
  tabBarInset?: boolean;
  /** Optional ref for tab re-press scroll-to-top. */
  scrollRef?: RefObject<ScrollView | null>;
  /** Pull-to-refresh when the scroll view is at the top. */
  refreshing?: boolean;
  onRefresh?: () => void;
  refreshVariant?: PullRefreshVariant;
};

/**
 * App screen shell — manual safe-area padding from frozen metrics (not SafeAreaView).
 * SafeAreaView re-insets when a background tab first focuses and shifts the whole page down.
 *
 * @see apps/mobile/docs/TAB_LAYOUT_STABILITY.md — do not regress
 */
export function Screen({
  children,
  scroll = false,
  centered = false,
  style,
  edges = ["top", "bottom", "left", "right"],
  fixedHeader,
  tabBarInset = false,
  scrollRef,
  refreshing = false,
  onRefresh,
  refreshVariant = "default",
}: ScreenProps) {
  const bottomPad = tabBarInset ? tabBarScrollInset(layoutInsets) : 0;
  const safePadding = layoutSafeAreaPadding(edges);

  const contentStyle = [
    styles.inner,
    centered && styles.centered,
    bottomPad > 0 && { paddingBottom: bottomPad },
    style,
  ];

  const scrollBodyStyle = [
    styles.scrollContent,
    fixedHeader ? styles.scrollBodyOnly : null,
    centered && styles.centered,
    bottomPad > 0 && { paddingBottom: bottomPad },
  ];

  const refreshControl =
    onRefresh ? (
      <IntencityRefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        variant={refreshVariant}
      />
    ) : undefined;

  return (
    <View style={[styles.safe, safePadding]}>
      {scroll ? (
        fixedHeader ? (
          <View style={styles.tabShell}>
            <View style={styles.fixedHeader}>{fixedHeader}</View>
            <ScrollView
              ref={scrollRef}
              style={styles.tabScroll}
              contentContainerStyle={scrollBodyStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
            >
              {children}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={scrollBodyStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        )
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  tabShell: {
    flex: 1,
    width: "100%",
    maxWidth: layout.contentMaxWidth + layout.screenPaddingX * 2,
    alignSelf: "center",
  },
  fixedHeader: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: layout.screenPaddingTop,
    width: "100%",
  },
  tabScroll: {
    flex: 1,
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
  scrollBodyOnly: {
    paddingTop: 0,
  },
  centered: {
    justifyContent: "center",
  },
});
