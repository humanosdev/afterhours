import { useEffect, useState } from "react";
import { Keyboard, Platform, useWindowDimensions } from "react-native";
import { isCompactLandingViewport, isTightLandingViewport } from "../theme/landingLayout";

/**
 * When true, auth surfaces use ScrollView overflow.
 * Normal iPhones: off unless keyboard open or measured overflow.
 */
export function useAuthViewportScroll(measuredOverflow = false) {
  const { height } = useWindowDimensions();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const compact = isCompactLandingViewport(height);
  const tight = isTightLandingViewport(height);

  const scrollEnabled = keyboardOpen || measuredOverflow || tight;

  return { scrollEnabled, keyboardOpen, compact, tight, windowHeight: height };
}
