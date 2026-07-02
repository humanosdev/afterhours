/** Unified read/write fallback radii — Phase 0 native cutover. */
export const DEFAULT_VENUE_INNER_RADIUS_M = 80;
export const DEFAULT_VENUE_OUTER_RADIUS_M = 200;

export function defaultVenueRadii(venue?: {
  inner_radius_m?: number | null;
  outer_radius_m?: number | null;
}): { inner: number; outer: number } {
  return {
    inner: venue?.inner_radius_m ?? DEFAULT_VENUE_INNER_RADIUS_M,
    outer: venue?.outer_radius_m ?? DEFAULT_VENUE_OUTER_RADIUS_M,
  };
}
