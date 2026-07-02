import { computePresenceFromGps, type ComputePresenceFromGpsResult, type VenueZoneType } from "@intencity/shared";
import type { DeviceCoords } from "./nativeForegroundLocation";
import type { VenuePublic } from "../types/venue";
import { venuesForPresenceSync } from "./venuesForPresenceSync";

export type LocalPresenceFsmState = {
  venueState: string;
  enteredInnerAt: string | null;
};

export type LocalPresencePreview = ComputePresenceFromGpsResult & {
  venue: VenuePublic | null;
  /** `inner_pending` — dwell clock running, not confirmed yet. */
  isSettlingHere: boolean;
  /** Inner confirmed or live inner zone for map chip. */
  isLiveHere: boolean;
  isAtVenue: boolean;
  zoneLabel: "here" | "nearby" | "arriving" | null;
};

export type LocalPresenceStepResult = {
  preview: LocalPresencePreview | null;
  zoneKey: string;
  zoneChanged: boolean;
};

export const EMPTY_LOCAL_FSM: LocalPresenceFsmState = {
  venueState: "outside",
  enteredInnerAt: null,
};

export function localPresenceZoneKey(
  venueId: string | null | undefined,
  zoneType: VenueZoneType | null | undefined
): string {
  if (!venueId || !zoneType) return "outside";
  return `${zoneType}:${venueId}`;
}

export function stepLocalPresencePreview(args: {
  coords: DeviceCoords;
  venues: VenuePublic[];
  fsm: LocalPresenceFsmState;
  /** Wall clock for dwell transitions when GPS is stationary (EVOLVE-3). */
  nowMs?: number;
  /** Restored FSM from memory / DB when remounting while still at the pin. */
  bootFsm?: LocalPresenceFsmState | null;
}): LocalPresenceStepResult {
  const syncVenues = venuesForPresenceSync(args.venues);
  if (!syncVenues.length) {
    return {
      preview: null,
      zoneKey: "outside",
      zoneChanged: false,
    };
  }

  const nowMs = args.nowMs ?? args.coords.recordedAtMs;

  const zoneProbe = computePresenceFromGps({
    lat: args.coords.lat,
    lng: args.coords.lng,
    venues: syncVenues,
    prevVenueState: "outside",
    prevEnteredInnerAt: null,
    nowMs,
  });

  let effectiveFsm = args.fsm;
  if (args.bootFsm && args.bootFsm.venueState !== "outside" && zoneProbe.zoneType === "inner") {
    if (
      effectiveFsm.venueState === "outside" ||
      (args.bootFsm.venueState === "inner_confirmed" &&
        effectiveFsm.venueState === "inner_pending")
    ) {
      effectiveFsm = args.bootFsm;
    }
  }

  let computed = computePresenceFromGps({
    lat: args.coords.lat,
    lng: args.coords.lng,
    venues: syncVenues,
    prevVenueState: effectiveFsm.venueState,
    prevEnteredInnerAt: effectiveFsm.enteredInnerAt,
    nowMs,
  });

  if (
    args.bootFsm?.venueState === "inner_confirmed" &&
    computed.zoneType === "inner" &&
    computed.venueId
  ) {
    computed = {
      ...computed,
      venueState: "inner_confirmed",
      enteredInnerAt: args.bootFsm.enteredInnerAt ?? computed.enteredInnerAt,
    };
  }

  const venue = computed.venueId
    ? args.venues.find((v) => v.id === computed.venueId) ?? null
    : null;

  const zoneKey = localPresenceZoneKey(computed.venueId, computed.zoneType);
  const isSettlingHere =
    computed.zoneType === "inner" && computed.venueState === "inner_pending";
  const isLiveHere =
    computed.zoneType === "inner" && computed.venueState === "inner_confirmed";
  const isAtVenue = Boolean(venue && computed.zoneType);

  let zoneLabel: LocalPresencePreview["zoneLabel"] = null;
  if (isSettlingHere) zoneLabel = "arriving";
  else if (isLiveHere) zoneLabel = "here";
  else if (computed.zoneType === "outer") zoneLabel = "nearby";
  else if (computed.zoneType === "halo") zoneLabel = "nearby";

  return {
    preview: {
      ...computed,
      venue,
      isSettlingHere,
      isLiveHere,
      isAtVenue,
      zoneLabel,
    },
    zoneKey,
    zoneChanged: false,
  };
}

export function nextLocalPresenceFsm(
  fsm: LocalPresenceFsmState,
  computed: ComputePresenceFromGpsResult
): LocalPresenceFsmState {
  return {
    venueState: computed.venueState,
    enteredInnerAt: computed.enteredInnerAt,
  };
}
