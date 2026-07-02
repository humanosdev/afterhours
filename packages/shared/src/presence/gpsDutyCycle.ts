import { distanceMeters } from "../geo/distanceMeters";
import { computePresenceFromGps } from "../venue/computePresenceFromGps";
import type { VenueForPresenceSync } from "../venue/types";

/** Phase 4.2 — stationary in inner zone before throttling GPS cadence. */
export const GPS_DUTY_CYCLE_STATIONARY_INNER_MS = 3 * 60_000;

/** Fixes must stay within this radius to count as stationary at a venue. */
export const GPS_DUTY_CYCLE_STATIONARY_RADIUS_M = 12;

/** Movement that bursts back to high-accuracy watch after stationary throttle. */
export const GPS_DUTY_CYCLE_BURST_MOVE_M = 20;

export type GpsDutyCycleMode = "active" | "stationary";

export type GpsDutyCycleState = {
  mode: GpsDutyCycleMode;
  anchorLat: number;
  anchorLng: number;
  anchorSinceMs: number;
};

export const INITIAL_GPS_DUTY_CYCLE_STATE: GpsDutyCycleState = {
  mode: "active",
  anchorLat: 0,
  anchorLng: 0,
  anchorSinceMs: 0,
};

export function isInnerZoneAtCoords(args: {
  lat: number;
  lng: number;
  venues: VenueForPresenceSync[];
}): boolean {
  const result = computePresenceFromGps({
    lat: args.lat,
    lng: args.lng,
    venues: args.venues,
  });
  return result.zoneType === "inner";
}

/** Life360-style foreground duty cycle — low power when seated inside, burst on move. */
export function stepGpsDutyCycle(args: {
  state: GpsDutyCycleState;
  lat: number;
  lng: number;
  isInnerZone: boolean;
  nowMs?: number;
}): GpsDutyCycleState {
  const nowMs = args.nowMs ?? Date.now();
  const { lat, lng, isInnerZone } = args;
  const { mode, anchorLat, anchorLng, anchorSinceMs } = args.state;

  if (!isInnerZone) {
    return { mode: "active", anchorLat: lat, anchorLng: lng, anchorSinceMs: nowMs };
  }

  if (mode === "stationary") {
    const movedM = distanceMeters(lat, lng, anchorLat, anchorLng);
    if (movedM >= GPS_DUTY_CYCLE_BURST_MOVE_M) {
      return { mode: "active", anchorLat: lat, anchorLng: lng, anchorSinceMs: nowMs };
    }
    return args.state;
  }

  if (anchorSinceMs <= 0) {
    return { mode: "active", anchorLat: lat, anchorLng: lng, anchorSinceMs: nowMs };
  }

  const driftM = distanceMeters(lat, lng, anchorLat, anchorLng);
  if (driftM > GPS_DUTY_CYCLE_STATIONARY_RADIUS_M) {
    return { mode: "active", anchorLat: lat, anchorLng: lng, anchorSinceMs: nowMs };
  }

  if (nowMs - anchorSinceMs >= GPS_DUTY_CYCLE_STATIONARY_INNER_MS) {
    return { mode: "stationary", anchorLat, anchorLng, anchorSinceMs };
  }

  return { mode: "active", anchorLat, anchorLng, anchorSinceMs };
}
