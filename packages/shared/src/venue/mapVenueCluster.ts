import { distanceMeters } from "../geo/distanceMeters";
import { INNER_CONFIRM_MS } from "../presence/constants";

/** Dwell before a nearby (outer-ring) friend can appear in the venue avatar stack. */
export const NEARBY_CLUSTER_DWELL_MS = INNER_CONFIRM_MS;

export type VenueZoneRadii = {
  id: string;
  lat: number;
  lng: number;
  inner_radius_m: number;
  outer_radius_m: number;
};

export type PresenceVenueZone = "inner" | "outer";

export type ResolvedPresenceVenueZone = {
  venueId: string;
  zone: PresenceVenueZone;
};

type CoordRow = { lat: number; lng: number };

/**
 * Best-match venue zone from coords — inner wins over outer (PWA / `computePresenceFromGps`).
 * Halo is excluded from map avatar stacks.
 */
export function resolvePresenceVenueZone(
  p: CoordRow,
  venues: VenueZoneRadii[]
): ResolvedPresenceVenueZone | null {
  let bestInner: { id: string; d: number } | null = null;
  let bestOuter: { id: string; d: number } | null = null;

  for (const v of venues) {
    const d = distanceMeters(p.lat, p.lng, v.lat, v.lng);
    if (d <= v.inner_radius_m && (!bestInner || d < bestInner.d)) {
      bestInner = { id: v.id, d };
    }
    if (d <= v.outer_radius_m && (!bestOuter || d < bestOuter.d)) {
      bestOuter = { id: v.id, d };
    }
  }

  if (bestInner) return { venueId: bestInner.id, zone: "inner" };
  if (bestOuter) return { venueId: bestOuter.id, zone: "outer" };
  return null;
}

export function isInVenueMapAirspace(p: CoordRow, venues: VenueZoneRadii[]): boolean {
  return resolvePresenceVenueZone(p, venues) != null;
}

/** DB FSM + optional client-side inner dwell start (ms). */
export function hasInnerClusterDwell(args: {
  zone: PresenceVenueZone | null;
  venueState?: string | null;
  enteredInnerAt?: string | null;
  clientInnerSinceMs?: number | null;
  nowMs?: number;
}): boolean {
  if (args.zone !== "inner") return false;
  const nowMs = args.nowMs ?? Date.now();
  if (args.venueState === "inner_confirmed") return true;
  if (args.venueState === "inner_pending" && args.enteredInnerAt) {
    return nowMs - new Date(args.enteredInnerAt).getTime() >= INNER_CONFIRM_MS;
  }
  if (args.clientInnerSinceMs != null) {
    return nowMs - args.clientInnerSinceMs >= INNER_CONFIRM_MS;
  }
  return false;
}

export function hasNearbyClusterDwell(args: {
  zone: PresenceVenueZone | null;
  clientOuterSinceMs?: number | null;
  nowMs?: number;
}): boolean {
  if (args.zone !== "outer") return false;
  if (args.clientOuterSinceMs == null) return false;
  const nowMs = args.nowMs ?? Date.now();
  return nowMs - args.clientOuterSinceMs >= NEARBY_CLUSTER_DWELL_MS;
}
