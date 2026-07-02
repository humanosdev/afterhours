import * as Location from "expo-location";
import { setCachedMapLastLocation } from "./mapLastLocationCache";
import { coordsFromPosition, fetchCurrentDeviceCoords } from "./nativeForegroundLocation";

/**
 * EVOLVE-4 — significant-location hint on foreground resume.
 * Uses OS last-known fix then a balanced read; updates local puck cache only (no DB write).
 */
export async function refreshCachedLocationOnResume(): Promise<void> {
  const perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) return;

  try {
    const lastKnown = await Location.getLastKnownPositionAsync();
    const fromLast = lastKnown ? coordsFromPosition(lastKnown) : null;
    if (fromLast) {
      setCachedMapLastLocation({
        lat: fromLast.lat,
        lng: fromLast.lng,
        recordedAtMs: fromLast.recordedAtMs,
      });
    }
  } catch {
    // Keep prior cache — never invent coords.
  }

  const fresh = await fetchCurrentDeviceCoords({ balanced: true, highPrecision: false });
  if (fresh) {
    setCachedMapLastLocation({
      lat: fresh.lat,
      lng: fresh.lng,
      recordedAtMs: fresh.recordedAtMs,
    });
  }
}
