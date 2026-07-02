import { distanceMeters } from "../geo/distanceMeters";
import type { ComputePresenceFromGpsResult, VenueForPresenceSync, VenueZoneType } from "../venue/types";

/** Phase 4 L2 — require tighter GPS before attaching inner zone (venue semantics). */
export const MAX_INNER_ATTACH_ACCURACY_M = 50;

/** Hold inner↔outer at the same venue when fixes oscillate faster than this. */
export const ZONE_JITTER_HOLD_MS = 12_000;

export type PresenceWritePrevRow = {
  venue_id: string | null;
  zone_type: string | null;
  venue_state: string | null;
  entered_inner_at: string | null;
  updated_at: string | null;
};

export type StableZoneSnapshot = {
  venueId: string | null;
  zoneType: VenueZoneType | null;
  sinceMs: number;
};

function isInnerOuterFlip(a: VenueZoneType | null, b: VenueZoneType | null): boolean {
  if (!a || !b) return false;
  return (a === "inner" && b === "outer") || (a === "outer" && b === "inner");
}

function prevZoneType(prev: PresenceWritePrevRow | null): VenueZoneType | null {
  const z = prev?.zone_type;
  return z === "inner" || z === "outer" || z === "halo" ? z : null;
}

function applyWeakAccuracyInnerGate(args: {
  computed: ComputePresenceFromGpsResult;
  prev: PresenceWritePrevRow | null;
  accuracyM: number | null;
  lat: number;
  lng: number;
  venues: VenueForPresenceSync[];
}): ComputePresenceFromGpsResult {
  const { computed, prev, accuracyM, lat, lng, venues } = args;
  if (computed.zoneType !== "inner" || !computed.venueId) return computed;
  if (accuracyM == null || accuracyM <= MAX_INNER_ATTACH_ACCURACY_M) return computed;

  const venue = venues.find((v) => v.id === computed.venueId);
  if (!venue) return computed;

  const d = distanceMeters(lat, lng, venue.lat, venue.lng);
  if (d > venue.outer_radius_m) return computed;

  const keepState =
    prev?.venue_id === computed.venueId && prevZoneType(prev) === "inner"
      ? prev.venue_state ?? computed.venueState
      : "outside";

  return {
    ...computed,
    zoneType: "outer",
    venueState: keepState,
    enteredInnerAt:
      prev?.venue_id === computed.venueId && prevZoneType(prev) === "inner"
        ? prev.entered_inner_at
        : null,
  };
}

function holdStableZone(args: {
  result: ComputePresenceFromGpsResult;
  prev: PresenceWritePrevRow | null;
  stableZone: StableZoneSnapshot | null;
  nowMs: number;
}): ComputePresenceFromGpsResult {
  const { result, prev, stableZone, nowMs } = args;
  if (!stableZone?.zoneType || !result.venueId || stableZone.venueId !== result.venueId) {
    return result;
  }
  if (!isInnerOuterFlip(stableZone.zoneType, result.zoneType)) return result;
  if (nowMs - stableZone.sinceMs >= ZONE_JITTER_HOLD_MS) return result;

  const heldZone = stableZone.zoneType;
  const heldState =
    prev?.venue_id === result.venueId && prevZoneType(prev) === heldZone
      ? prev.venue_state ?? result.venueState
      : result.venueState;
  const heldEntered =
    prev?.venue_id === result.venueId && prevZoneType(prev) === heldZone
      ? prev.entered_inner_at
      : result.enteredInnerAt;

  return {
    ...result,
    zoneType: heldZone,
    venueState: heldState ?? result.venueState,
    enteredInnerAt: heldEntered ?? null,
  };
}

function nextStableZone(
  result: ComputePresenceFromGpsResult,
  stableZone: StableZoneSnapshot | null,
  nowMs: number
): StableZoneSnapshot {
  if (result.zoneType == null && result.venueId == null) {
    return { venueId: null, zoneType: null, sinceMs: nowMs };
  }
  if (
    stableZone &&
    stableZone.venueId === result.venueId &&
    stableZone.zoneType === result.zoneType
  ) {
    return stableZone;
  }
  return {
    venueId: result.venueId,
    zoneType: result.zoneType,
    sinceMs: nowMs,
  };
}

/** Phase 4 L2 — accuracy + inner/outer jitter hold before persisting presence. */
export function applyPresenceWriteConfidence(args: {
  computed: ComputePresenceFromGpsResult;
  prev: PresenceWritePrevRow | null;
  accuracyM: number | null;
  lat: number;
  lng: number;
  venues: VenueForPresenceSync[];
  stableZone: StableZoneSnapshot | null;
  nowMs?: number;
}): { result: ComputePresenceFromGpsResult; stableZone: StableZoneSnapshot } {
  const nowMs = args.nowMs ?? Date.now();
  let result = applyWeakAccuracyInnerGate(args);
  result = holdStableZone({
    result,
    prev: args.prev,
    stableZone: args.stableZone,
    nowMs,
  });
  const stableZone = nextStableZone(result, args.stableZone, nowMs);
  return { result, stableZone };
}
