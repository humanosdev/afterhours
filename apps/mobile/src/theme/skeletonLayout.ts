import type { ViewStyle } from "react-native";
import { hubLayout } from "./hubLayout";
import { layout } from "./layout";

/** Pin tab/async skeleton bands to the computed scroll body height. */
export function skeletonBandPageStyle(minHeight: number): ViewStyle {
  return {
    width: "100%",
    height: minHeight,
    minHeight,
    flexDirection: "column",
  };
}

/** TabScreenHeader block — title row + divider rhythm. */
export function tabScreenHeaderChromeHeight(): number {
  return 44 + 12 + 12;
}

/** Messages tab chrome above the inbox list. */
export function chatTabChromeAboveListPx(): number {
  const header = tabScreenHeaderChromeHeight();
  const search = 44 + layout.sectionGap;
  const tabs = 10 + 36 + 4;
  return header + search + tabs;
}

/** Hub tab chrome above the feed stack. */
export function hubTabChromeAboveFeedPx(): number {
  const header = tabScreenHeaderChromeHeight();
  const search = layout.searchBarHeight + hubLayout.searchBottomGap;
  return header + search;
}

/** Profile tab chrome above the identity shell. */
export function profileTabChromeAboveIdentityPx(): number {
  return tabScreenHeaderChromeHeight() + 8;
}
