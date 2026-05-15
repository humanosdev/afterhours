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

/** Friend nearby notification threshold (meters). Production wiring remains in apps/web. */
export const NEARBY_THRESHOLD_M = 300;

/** Inner zone confirmation delay after `inner_pending`. */
export const INNER_CONFIRM_MS = 60_000;
