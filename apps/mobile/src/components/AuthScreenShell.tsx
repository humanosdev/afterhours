import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type AuthScreenShellProps = {
  children: ReactNode;
  marketing?: boolean;
  marketingScroll?: boolean;
  /** Form screens: top-aligned column (keyboard-safe). Default marketing column centers like web `my-auto`. */
  anchorTop?: boolean;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Mirrors web `AuthScreenShell` — full charcoal canvas with safe-area padding.
 * `marketing` + !`anchorTop`: vertically centers column like web `my-auto` (non-form shells only).
 */
export function AuthScreenShell({
  children,
  marketing = false,
  marketingScroll = false,
  anchorTop = false,
  centered = false,
  style,
}: AuthScreenShellProps) {
  const insets = useSafeAreaInsets();
  const padTop =
    Math.max(insets.top, 0) +
    (marketingScroll || anchorTop ? layout.authPaddingTopScroll : layout.authPaddingTop);
  const scrollBottomPad = Math.max(insets.bottom, 0) + layout.authPaddingBottom;
  const padBottom =
    anchorTop || marketingScroll ? Math.max(insets.bottom, 0) : Math.max(insets.bottom, layout.authPaddingBottom);
  const isMarketingColumn = marketing || marketingScroll;

  const useMarketingCenter = marketing && !marketingScroll && !anchorTop;

  const shellStyle = [
    styles.shell,
    { paddingTop: padTop, paddingBottom: padBottom },
    useMarketingCenter && styles.shellMarketingCenter,
    centered && styles.shellCentered,
    style,
  ];

  const columnStyle = [
    styles.column,
    isMarketingColumn && styles.columnMarketing,
    isMarketingColumn && { maxWidth: layout.authMarketingMaxWidth },
    centered && styles.columnCentered,
  ];

  if (marketingScroll) {
    return (
      <View style={shellStyle}>
        <ScrollView
          style={styles.scrollFill}
          contentContainerStyle={[
            styles.scrollColumn,
            { maxWidth: layout.authMarketingMaxWidth },
            { paddingBottom: scrollBottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical
        >
          <View style={columnStyle}>{children}</View>
        </ScrollView>
      </View>
    );
  }

  /** Form screens pass their own ScrollView — avoid `flexGrow:0` column wrapper collapsing height to 0. */
  if (anchorTop) {
    return <View style={shellStyle}>{children}</View>;
  }

  return (
    <View style={shellStyle}>
      <View style={columnStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: layout.authPaddingX,
  },
  shellMarketingCenter: {
    justifyContent: "center",
  },
  shellCentered: {
    justifyContent: "center",
  },
  scrollFill: {
    flex: 1,
    width: "100%",
  },
  scrollColumn: {
    width: "100%",
    alignSelf: "center",
  },
  column: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
  },
  columnMarketing: {
    flexGrow: 0,
  },
  columnCentered: {
    justifyContent: "center",
  },
});
