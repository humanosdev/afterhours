import { useCallback, useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";

function readKeyboardInset(event: KeyboardEvent): number {
  return Math.max(0, event.endCoordinates.height);
}

/** Tracks on-screen keyboard height for docking composers above the keyboard. */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (event: KeyboardEvent) => setInset(readKeyboardInset(event));
    const onHide = () => setInset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return { inset, visible: inset > 0, dismiss };
}
