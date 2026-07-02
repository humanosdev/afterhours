import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  isTabBootConsumed,
  markTabBootConsumed,
  useColdOpenBootEligible,
} from "../providers/AppTabBootProvider";
import {
  SKELETON_FITTED_MIN_DISPLAY_MS,
  useMinimumSkeleton,
} from "./useMinimumSkeleton";

/**
 * Cold-open tab shell — one minimum skeleton hold the first time each tab is focused
 * after launch (not on revisits). Also holds while `loading` with the same minimum.
 */
export function useTabBootShell(
  loading: boolean,
  minMs: number = SKELETON_FITTED_MIN_DISPLAY_MS,
  enabled = true,
  tabBootKey?: string
): boolean {
  const coldOpenEligible = useColdOpenBootEligible();
  const [focusBoot, setFocusBoot] = useState(false);
  const dataHold = useMinimumSkeleton(loading, minMs);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !tabBootKey || !coldOpenEligible || isTabBootConsumed(tabBootKey)) {
        return;
      }
      markTabBootConsumed(tabBootKey);
      setFocusBoot(true);
      const timer = setTimeout(() => setFocusBoot(false), minMs);
      return () => {
        clearTimeout(timer);
        setFocusBoot(false);
      };
    }, [enabled, tabBootKey, coldOpenEligible, minMs])
  );

  if (!enabled) return dataHold;
  if (focusBoot) return true;
  return dataHold;
}

/** @deprecated Use useTabBootShell */
export function useAppSessionBootShell(
  loading: boolean,
  minMs: number = SKELETON_FITTED_MIN_DISPLAY_MS,
  enabled = true
): boolean {
  return useTabBootShell(loading, minMs, enabled);
}
