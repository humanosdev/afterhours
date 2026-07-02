import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthViewportScroll } from "../hooks/useAuthViewportScroll";
import { AuthScreenShell } from "./AuthScreenShell";
import { layout } from "../theme/layout";

type AuthViewportLayoutProps = {
  children: ReactNode;
  /** Landing: distribute upper hero/cards vs lower CTA when viewport-fit. */
  pinFooter?: boolean;
};

/**
 * Viewport-fit auth shell — fixed composition first; scroll only on overflow / keyboard / tight phones.
 */
export function AuthViewportLayout({ children, pinFooter = false }: AuthViewportLayoutProps) {
  const insets = useSafeAreaInsets();
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const measuredOverflow = viewportH > 0 && contentH > viewportH + 2;
  const { scrollEnabled } = useAuthViewportScroll(measuredOverflow);

  const onViewportLayout = useCallback((h: number) => {
    setViewportH(h);
  }, []);

  const onContentLayout = useCallback((h: number) => {
    setContentH(h);
  }, []);

  const bottomPad = Math.max(insets.bottom, 0) + (scrollEnabled ? layout.authPaddingBottom : 6);

  const fitToViewport = !scrollEnabled && viewportH > 0;

  return (
    <AuthScreenShell marketing anchorTop>
      <View
        style={styles.viewport}
        onLayout={(e) => onViewportLayout(e.nativeEvent.layout.height)}
      >
        <ScrollView
          style={styles.scroll}
          scrollEnabled={scrollEnabled}
          bounces={scrollEnabled}
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[
            styles.scrollContent,
            {
              maxWidth: layout.authMarketingMaxWidth,
              minHeight: fitToViewport ? viewportH : undefined,
              justifyContent: pinFooter && fitToViewport ? "space-between" : "flex-start",
              paddingBottom: bottomPad,
            },
          ]}
        >
          <View onLayout={(e) => onContentLayout(e.nativeEvent.layout.height)}>{children}</View>
        </ScrollView>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: "100%",
  },
  scroll: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    width: "100%",
    alignSelf: "center",
    flexGrow: 1,
  },
});
