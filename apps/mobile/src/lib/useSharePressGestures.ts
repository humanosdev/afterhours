import { useCallback, useEffect, useRef } from "react";

const DOUBLE_TAP_MS = 260;

type SharePressGestureOptions = {
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  /** When false, only double-tap is handled (hub feed media). */
  enableSingleTap?: boolean;
};

/**
 * Instagram-style single vs double tap: wait `DOUBLE_TAP_MS` before firing single;
 * second tap inside window fires double instead.
 */
export function useSharePressGestures({
  onSingleTap,
  onDoubleTap,
  enableSingleTap = true,
}: SharePressGestureOptions) {
  const lastTapAtRef = useRef(0);
  const singleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (singleTimerRef.current) clearTimeout(singleTimerRef.current);
    };
  }, []);

  const onPress = useCallback(() => {
    const now = Date.now();
    const sinceLast = now - lastTapAtRef.current;
    lastTapAtRef.current = now;

    if (sinceLast > 0 && sinceLast < DOUBLE_TAP_MS) {
      if (singleTimerRef.current) {
        clearTimeout(singleTimerRef.current);
        singleTimerRef.current = null;
      }
      onDoubleTap?.();
      return;
    }

    if (!enableSingleTap || !onSingleTap) return;

    if (singleTimerRef.current) clearTimeout(singleTimerRef.current);
    singleTimerRef.current = setTimeout(() => {
      singleTimerRef.current = null;
      onSingleTap();
    }, DOUBLE_TAP_MS);
  }, [enableSingleTap, onDoubleTap, onSingleTap]);

  return onPress;
}
