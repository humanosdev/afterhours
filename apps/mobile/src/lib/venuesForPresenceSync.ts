import {
  DEFAULT_VENUE_INNER_RADIUS_M,
  DEFAULT_VENUE_OUTER_RADIUS_M,
  type VenueForPresenceSync,
} from "@intencity/shared";
import type { VenuePublic } from "../types/venue";

/** Write-path fallbacks — aligned with read path (Phase 0 native cutover). */
export const PRESENCE_SYNC_INNER_RADIUS_M = DEFAULT_VENUE_INNER_RADIUS_M;
export const PRESENCE_SYNC_OUTER_RADIUS_M = DEFAULT_VENUE_OUTER_RADIUS_M;

export function venuesForPresenceSync(venues: VenuePublic[]): VenueForPresenceSync[] {
  return venues
    .filter((v) => typeof v.lat === "number" && typeof v.lng === "number")
    .map((v) => ({
      id: v.id,
      name: v.name,
      lat: v.lat as number,
      lng: v.lng as number,
      inner_radius_m: v.inner_radius_m ?? PRESENCE_SYNC_INNER_RADIUS_M,
      outer_radius_m: v.outer_radius_m ?? PRESENCE_SYNC_OUTER_RADIUS_M,
      halo_radius_m: null as number | null,
    }));
}
