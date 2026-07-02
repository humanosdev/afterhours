import { isValidCoordinatePair } from "@intencity/shared";
import { distanceMeters } from "./venuePresenceStats";

/** EVOLVE-1 — reject wide fixes before they move the local puck (campus walking). */
export const MAX_DEVICE_ACCURACY_M = 80;

/** Reject impossible jumps between fixes (~200 km/h cap). */
export const MAX_TELEPORT_SPEED_MPS = 55;

export type DeviceFixSample = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  recordedAtMs: number;
};

export function acceptDeviceFix(
  next: DeviceFixSample,
  prev: DeviceFixSample | null
): boolean {
  if (!isValidCoordinatePair(next.lat, next.lng)) return false;
  if (next.accuracyM != null && Number.isFinite(next.accuracyM) && next.accuracyM > MAX_DEVICE_ACCURACY_M) {
    return false;
  }
  if (!prev || !isValidCoordinatePair(prev.lat, prev.lng)) return true;

  const dtMs = next.recordedAtMs - prev.recordedAtMs;
  if (!Number.isFinite(dtMs) || dtMs <= 0) return true;

  const distM = distanceMeters(prev.lat, prev.lng, next.lat, next.lng);
  const speedMps = distM / (dtMs / 1000);
  if (speedMps > MAX_TELEPORT_SPEED_MPS) return false;

  return true;
}
