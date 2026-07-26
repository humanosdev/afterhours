import { useLayoutEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  isTabBootConsumed,
  markTabBootConsumed,
} from "../providers/AppTabBootProvider";
import { motion } from "../theme/motion";

/** One 1.2s skeleton hold the first time each main tab is focused after launch. */
export const TAB_COLD_OPEN_BOOT_MS = motion.skeleton.fittedMinDisplayMs;

/**
 * True during the first focused visit of a tab — fixed 1200ms, not tied to fetch state.
 * Consumed only after the hold completes while focused (spurious focus blips are ignored).
 */
export function useTabColdOpenBoot(tabKey: string): boolean {
  const isFocused = useIsFocused();
  const [booting, setBooting] = useState(() => !isTabBootConsumed(tabKey));

  useLayoutEffect(() => {
    if (isTabBootConsumed(tabKey)) {
      setBooting(false);
      return;
    }

    if (!isFocused) {
      setBooting(true);
      return;
    }

    setBooting(true);
    const timer = setTimeout(() => {
      markTabBootConsumed(tabKey);
      setBooting(false);
    }, TAB_COLD_OPEN_BOOT_MS);

    return () => clearTimeout(timer);
  }, [isFocused, tabKey]);

  if (isTabBootConsumed(tabKey)) return false;
  if (!isFocused) return false;
  return booting;
}
