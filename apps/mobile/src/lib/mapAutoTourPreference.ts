import * as SecureStore from "expo-secure-store";

/** PWA `localStorage` key `map_auto_venue_tour_enabled`. */
const STORAGE_KEY = "map_auto_venue_tour_enabled";

export async function readMapAutoVenueTourEnabled(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
    await SecureStore.setItemAsync(STORAGE_KEY, "true");
    return true;
  } catch {
    return true;
  }
}

export async function writeMapAutoVenueTourEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, enabled ? "true" : "false");
}
