export const RECENT_WINDOW_MS = 60 * 60_000;

/**
 * Venue heat counts, map participation bands, distance thresholds that mean “still around this spot.”
 * Keep this **looser** so dots don’t flicker off while someone is walking nearby but pings slowly.
 */
export const MAP_ACTIVITY_WINDOW_MS = 20 * 60_000;

/** @deprecated Use MAP_ACTIVITY_WINDOW_MS — alias for existing imports */
export const LIVE_WINDOW_MS = MAP_ACTIVITY_WINDOW_MS;

/**
 * Friend-facing “Online now” label / pulse ring / profile status — **stricter** than venue math.
 * Does **not** change who counts toward venue heat (`isPresenceLive` still uses MAP_ACTIVITY_WINDOW_MS).
 */
export const FRIEND_ONLINE_BADGE_MS = 4 * 60_000;

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

/** “Live / recent / stale” tiers use **map activity** timing (includes venue & heat logic). */
export function getPresenceFreshness(updatedAt: string | null | undefined, nowMs = Date.now()): PresenceFreshness {
  if (!updatedAt) return "stale";
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return "stale";
  const age = Math.max(0, nowMs - ts);
  if (age <= MAP_ACTIVITY_WINDOW_MS) return "live";
  if (age <= RECENT_WINDOW_MS) return "recent";
  return "stale";
}

/** Venue counts, heatmap “people here,” notifications nearby — **map activity window** (~20 min). */
export function isPresenceLive(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  return getPresenceFreshness(updatedAt, nowMs) === "live";
}

/** Friends strip “Online now”, pulse ring, profile **Online** — **badge window** (~4 min). */
export function isFriendOnlineNow(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!updatedAt) return false;
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return nowMs - ts <= FRIEND_ONLINE_BADGE_MS;
}

export function isPresenceRecent(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  return getPresenceFreshness(updatedAt, nowMs) === "recent";
}

/**
 * Hub / Friends list / any “@user · …” line: one ladder so **Online** (`isFriendOnlineNow`)
 * matches strips, while softer **Away** / **Recently** use map windows (20m / 60m).
 */
export function getFriendSocialActivitySubtitle(
  args: {
    ghostMode: boolean;
    updatedAt: string | null | undefined;
    venueId: string | null | undefined;
    venueName: string | null | undefined;
  },
  nowMs = Date.now()
): string {
  if (args.ghostMode) return "Hiding location";
  const v = args.venueName?.trim();
  const hasVenue = Boolean(args.venueId && v);
  if (isFriendOnlineNow(args.updatedAt, nowMs)) {
    return hasVenue ? `At ${v}` : "Active now";
  }
  if (isPresenceLive(args.updatedAt, nowMs)) {
    return hasVenue ? `Away · At ${v}` : "Away";
  }
  if (isPresenceRecent(args.updatedAt, nowMs)) {
    return hasVenue ? `Recently at ${v}` : "Recently active";
  }
  return "Offline";
}

/** Friends-only venue pill on `/u/[username]` (caller handles ghost / not-friend). */
export function getFriendProfileVenueHeadline(
  args: { updatedAt: string | null | undefined; venueName: string | null | undefined },
  nowMs = Date.now()
): string {
  const v = args.venueName?.trim();
  if (!v) return "Not at a venue";
  if (isFriendOnlineNow(args.updatedAt, nowMs)) return `At ${v}`;
  if (isPresenceLive(args.updatedAt, nowMs)) return `Away · At ${v}`;
  if (isPresenceRecent(args.updatedAt, nowMs)) return `Recently at ${v}`;
  return "Not at a venue";
}

/** Profile “Status” column for someone else’s page. */
export function getFriendProfileStatusLabel(
  args: { ghostMode: boolean; isFriend: boolean; updatedAt: string | null | undefined },
  nowMs = Date.now()
): string {
  if (args.ghostMode) return "Hiding location";
  if (!args.isFriend) return "—";
  if (isFriendOnlineNow(args.updatedAt, nowMs)) return "Online";
  if (isPresenceLive(args.updatedAt, nowMs) || isPresenceRecent(args.updatedAt, nowMs)) return "Away";
  return "Offline";
}
