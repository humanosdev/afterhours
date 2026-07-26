import type { ViewStyle } from "react-native";
import type { Edge, EdgeInsets } from "react-native-safe-area-context";
import { initialWindowMetrics } from "react-native-safe-area-context";

const FALLBACK_INSETS: EdgeInsets = { top: 47, bottom: 34, left: 0, right: 0 };

/**
 * Safe-area insets frozen at module load from the first native window metrics.
 * Never use live `useSafeAreaInsets()` for page chrome — it ticks when a hidden tab
 * first becomes visible and shifts the whole screen downward.
 */
export const layoutInsets: EdgeInsets = initialWindowMetrics?.insets ?? FALLBACK_INSETS;

export function layoutSafeAreaPadding(
  edges: Edge[]
): Pick<ViewStyle, "paddingTop" | "paddingBottom" | "paddingLeft" | "paddingRight"> {
  const edgeSet = new Set(edges);
  return {
    paddingTop: edgeSet.has("top") ? layoutInsets.top : 0,
    paddingBottom: edgeSet.has("bottom") ? layoutInsets.bottom : 0,
    paddingLeft: edgeSet.has("left") ? layoutInsets.left : 0,
    paddingRight: edgeSet.has("right") ? layoutInsets.right : 0,
  };
}
