export const RECENT_WINDOW_MS = 30 * 60_000;

/**
 * Map markers, social “live” copy, friend Away · At {venue}.
 * P2O-D: 12m ≈ 144 missed 5s pings (was 20m / ~100×12s PWA pings).
 */
export const MAP_ACTIVITY_WINDOW_MS = 12 * 60_000;

/**
 * Venue heat counts, glow, checkpoint sort — stricter than social live copy.
 * P2O-D: 8m so dead venues lose glow within ~96 missed native pings.
 */
export const HEAT_ACTIVITY_WINDOW_MS = 8 * 60_000;

/** @deprecated Use MAP_ACTIVITY_WINDOW_MS — alias for existing imports */
export const LIVE_WINDOW_MS = MAP_ACTIVITY_WINDOW_MS;

/**
 * Friend-facing “Online now” label / pulse ring / profile status.
 * P2O-D: 2m ≈ 24 missed 5s pings (was 4m / ~20×12s PWA pings).
 */
export const FRIEND_ONLINE_BADGE_MS = 2 * 60_000;

/** Matches `map/page.tsx` initial Mapbox center — rows without real GPS often sit here and stack as one cluster. */
export const MAP_FALLBACK_CENTER_LAT = 39.9526;
export const MAP_FALLBACK_CENTER_LNG = -75.1636;

/** Friend nearby notification threshold (meters). */
export const NEARBY_THRESHOLD_M = 300;

/** Inner zone confirmation delay after `inner_pending`. P2O-D: 90s reduces GPS jitter false confirms. */
export const INNER_CONFIRM_MS = 90_000;

/** Profile venues — continuous inner-zone dwell before a venue is listed permanently. */
export const PROFILE_VENUE_DWELL_MS = 15 * 60_000;

/** @deprecated Use PROFILE_VENUE_DWELL_MS */
export const PROFILE_PLACE_DWELL_MS = PROFILE_VENUE_DWELL_MS;
