export const LIVE_WINDOW_MS = 20 * 60_000;
export const RECENT_WINDOW_MS = 60 * 60_000;

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
