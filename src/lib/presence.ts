export const LIVE_WINDOW_MS = 20 * 60_000;
export const RECENT_WINDOW_MS = 60 * 60_000;

/** Matches `map/page.tsx` initial Mapbox center — rows without real GPS often sit here and stack as one cluster. */
export const MAP_FALLBACK_CENTER_LAT = 39.9526;
export const MAP_FALLBACK_CENTER_LNG = -75.1636;

/** True when coords are effectively the map default (DB placeholder / missing GPS), not a real pin. */
export function isLikelyMapFallbackPresence(lat: number, lng: number): boolean {
  const eps = 0.00045;
  return (
    Math.abs(lat - MAP_FALLBACK_CENTER_LAT) < eps &&
    Math.abs(lng - MAP_FALLBACK_CENTER_LNG) < eps
  );
}

export type PresenceFreshness = "live" | "recent" | "stale";

export function isValidCoordinatePair(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function getPresenceFreshness(updatedAt: string | null | undefined, nowMs = Date.now()): PresenceFreshness {
  if (!updatedAt) return "stale";
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return "stale";
  const age = Math.max(0, nowMs - ts);
  if (age <= LIVE_WINDOW_MS) return "live";
  if (age <= RECENT_WINDOW_MS) return "recent";
  return "stale";
}

export function isPresenceLive(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  return getPresenceFreshness(updatedAt, nowMs) === "live";
}

export function isPresenceRecent(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  return getPresenceFreshness(updatedAt, nowMs) === "recent";
}
