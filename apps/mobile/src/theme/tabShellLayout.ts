import type { EdgeInsets } from "react-native-safe-area-context";
import { tabBarScrollInset } from "../shell/tabBarMetrics";
import { layout } from "./layout";

/** Scroll body height below tab chrome — pin while fitted shell is loading. */
export function tabBodyLockedHeight(
  windowHeight: number,
  insets: EdgeInsets,
  chromeAboveBodyPx: number
): number {
  const chrome =
    insets.top +
    layout.screenPaddingTop +
    chromeAboveBodyPx +
    layout.screenPaddingBottom +
    tabBarScrollInset(insets);
  return Math.max(360, Math.round(windowHeight - chrome));
}
