import { MAP_FALLBACK_CENTER_LAT, MAP_FALLBACK_CENTER_LNG } from "./constants";

/** True when coords are effectively the map default (DB placeholder / missing GPS), not a real pin. */
export function isLikelyMapFallbackPresence(lat: number, lng: number): boolean {
  const eps = 0.00045;
  return (
    Math.abs(lat - MAP_FALLBACK_CENTER_LAT) < eps &&
    Math.abs(lng - MAP_FALLBACK_CENTER_LNG) < eps
  );
}

export function isValidCoordinatePair(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
