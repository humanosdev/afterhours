import type { VenueForPresenceSync } from "./types";

export function haloLimitM(v: VenueForPresenceSync): number {
  if (typeof v.halo_radius_m === "number" && Number.isFinite(v.halo_radius_m) && v.halo_radius_m > 0) {
    return v.halo_radius_m;
  }
  return Math.max(Math.round(v.outer_radius_m * 1.35), v.outer_radius_m + 40);
}
