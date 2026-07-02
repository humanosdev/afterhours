import { useMemo, useRef } from "react";
import { PanResponder } from "react-native";

/** Downward swipe on a composer/footer strip dismisses the keyboard. */
export function useKeyboardDismissPan(dismiss: () => void, enabled: boolean) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          enabledRef.current && gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2,
        onPanResponderRelease: (_, gesture) => {
          if (!enabledRef.current) return;
          if (gesture.dy > 14 || gesture.vy > 0.45) dismiss();
        },
      }).panHandlers,
    [dismiss]
  );
}
