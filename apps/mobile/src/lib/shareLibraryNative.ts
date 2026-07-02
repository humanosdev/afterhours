import { requireOptionalNativeModule } from "expo-modules-core";

/** True after `npx expo run:ios` / `run:android` with expo-media-library linked. */
export function isShareLibraryNativeAvailable(): boolean {
  return requireOptionalNativeModule("ExpoMediaLibrary") != null;
}
