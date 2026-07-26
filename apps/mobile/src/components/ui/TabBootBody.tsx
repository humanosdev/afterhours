import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTabColdOpenBoot } from "../../hooks/useTabColdOpenBoot";
import { isTabBootConsumed } from "../../providers/AppTabBootProvider";
import { colors } from "../../theme/colors";

export type TabBootKey = "hub" | "chat" | "profile";

type TabBootBodyProps = {
  tabKey: TabBootKey;
  minHeight: number;
  skeleton: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Main-tab body slot — real content mounts immediately; opaque skeleton covers until boot ends.
 * No crossfade (fade exposed geometry mismatches and caused visible jumps in QA video).
 */
export function TabBootBody({ tabKey, minHeight, skeleton, children, style }: TabBootBodyProps) {
  const booting = useTabColdOpenBoot(tabKey);
  const visited = isTabBootConsumed(tabKey);
  const showOverlay = !visited || booting;

  const slotStyle: StyleProp<ViewStyle> = [
    styles.slot,
    style,
    minHeight > 0 ? { minHeight, flexGrow: 1 } : null,
  ];

  return (
    <View style={slotStyle}>
      <View
        style={[styles.content, minHeight > 0 ? { minHeight, flexGrow: 1 } : null]}
        pointerEvents={showOverlay ? "none" : "auto"}
        accessibilityElementsHidden={showOverlay}
        importantForAccessibility={showOverlay ? "no-hide-descendants" : "auto"}
      >
        {children}
      </View>
      {showOverlay ? (
        <View
          style={styles.overlay}
          pointerEvents="auto"
          accessibilityElementsHidden
        >
          {skeleton}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: "100%",
    alignSelf: "stretch",
    position: "relative",
  },
  content: {
    width: "100%",
    alignSelf: "stretch",
    flexGrow: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgPrimary,
  },
});
