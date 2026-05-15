import { distanceMeters } from "../geo/distanceMeters";
import { INNER_CONFIRM_MS } from "../presence/constants";
import { haloLimitM } from "./haloLimitM";
import type { ComputePresenceFromGpsResult, VenueForPresenceSync, VenueZoneType } from "./types";

/**
 * Pure venue zone selection + state transitions (mirrors apps/web `userPresenceVenueSync` inline logic).
 * Not wired to production yet — Phase 1B will call this from `syncUserPresenceWithVenuesFromCoords`.
 */
export function computePresenceFromGps(args: {
  lat: number;
  lng: number;
  venues: VenueForPresenceSync[];
  prevVenueState?: string;
  prevEnteredInnerAt?: string | null;
  nowMs?: number;
}): ComputePresenceFromGpsResult {
  const nowMs = args.nowMs ?? Date.now();
  const prevState = args.prevVenueState ?? "outside";
  let nextVenueState = prevState;
  let enteredInnerAt = args.prevEnteredInnerAt ?? null;

  let venueId: string | null = null;
  let zoneType: VenueZoneType | null = null;

  let bestInner = { id: null as string | null, d: Infinity };
  let bestOuter = { id: null as string | null, d: Infinity };
  let bestHalo = { id: null as string | null, d: Infinity };

  for (const v of args.venues) {
    const d = distanceMeters(args.lat, args.lng, v.lat, v.lng);
    if (d <= v.inner_radius_m && d < bestInner.d) bestInner = { id: v.id, d };
    if (d <= v.outer_radius_m && d < bestOuter.d) bestOuter = { id: v.id, d };
    const haloM = haloLimitM(v);
    if (d <= haloM && d < bestHalo.d) bestHalo = { id: v.id, d };
  }

  if (bestInner.id) {
    venueId = bestInner.id;
    zoneType = "inner";
  } else if (bestOuter.id) {
    venueId = bestOuter.id;
    zoneType = "outer";
  } else if (bestHalo.id) {
    venueId = bestHalo.id;
    zoneType = "halo";
  }

  if (zoneType === "inner" && prevState !== "inner_pending" && prevState !== "inner_confirmed") {
    nextVenueState = "inner_pending";
    enteredInnerAt = new Date(nowMs).toISOString();
  }

  if (zoneType !== "inner" && prevState !== "outside") {
    nextVenueState = "outside";
    enteredInnerAt = null;
  }

  if (prevState === "inner_pending" && enteredInnerAt) {
    if (nowMs - new Date(enteredInnerAt).getTime() >= INNER_CONFIRM_MS) {
      nextVenueState = "inner_confirmed";
    }
  }

  return {
    venueId,
    zoneType,
    venueState: nextVenueState,
    enteredInnerAt,
  };
}
