import { Platform } from "react-native";

/** True when native blur modules are expected (dev client / production build). Expo Go may still vary. */
export function canUseNativeBlur(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}
