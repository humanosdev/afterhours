import {
  FRIEND_ONLINE_BADGE_MS,
  HEAT_ACTIVITY_WINDOW_MS,
  MAP_ACTIVITY_WINDOW_MS,
  RECENT_WINDOW_MS,
} from "./constants";

export type PresenceFreshness = "live" | "recent" | "stale";

/** “Live / recent / stale” tiers use **map activity** timing (includes venue & social copy). */
export function getPresenceFreshness(
  updatedAt: string | null | undefined,
  nowMs = Date.now()
): PresenceFreshness {
  if (!updatedAt) return "stale";
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return "stale";
  const age = Math.max(0, nowMs - ts);
  if (age <= MAP_ACTIVITY_WINDOW_MS) return "live";
  if (age <= RECENT_WINDOW_MS) return "recent";
  return "stale";
}

/** Map markers, social copy, notifications nearby — **map activity window** (~12 min). */
export function isPresenceLive(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  return getPresenceFreshness(updatedAt, nowMs) === "live";
}

/** Venue heat / glow / checkpoint sort — stricter than social “live” copy (~8 min). */
export function isPresenceLiveForHeat(
  updatedAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!updatedAt) return false;
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return nowMs - ts <= HEAT_ACTIVITY_WINDOW_MS;
}

/** Friends strip “Online now”, pulse ring, profile **Online** — **badge window** (~2 min). */
export function isFriendOnlineNow(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!updatedAt) return false;
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return nowMs - ts <= FRIEND_ONLINE_BADGE_MS;
}

export function isPresenceRecent(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  return getPresenceFreshness(updatedAt, nowMs) === "recent";
}
