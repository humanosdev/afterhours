import assert from "node:assert/strict";
import test from "node:test";
import {
  GPS_DUTY_CYCLE_BURST_MOVE_M,
  GPS_DUTY_CYCLE_STATIONARY_INNER_MS,
  GPS_DUTY_CYCLE_STATIONARY_RADIUS_M,
  INITIAL_GPS_DUTY_CYCLE_STATE,
  isInnerZoneAtCoords,
  stepGpsDutyCycle,
} from "./gpsDutyCycle";
import type { VenueForPresenceSync } from "../venue/types";

const venue: VenueForPresenceSync = {
  id: "v1",
  name: "Test",
  lat: 39.9526,
  lng: -75.1636,
  inner_radius_m: 40,
  outer_radius_m: 120,
};

test("isInnerZoneAtCoords detects inner ring", () => {
  assert.equal(
    isInnerZoneAtCoords({ lat: venue.lat, lng: venue.lng, venues: [venue] }),
    true
  );
  assert.equal(
    isInnerZoneAtCoords({ lat: venue.lat + 0.002, lng: venue.lng, venues: [venue] }),
    false
  );
});

test("stepGpsDutyCycle resets to active outside inner zone", () => {
  const next = stepGpsDutyCycle({
    state: { mode: "stationary", anchorLat: 1, anchorLng: 2, anchorSinceMs: 1000 },
    lat: venue.lat + 0.01,
    lng: venue.lng,
    isInnerZone: false,
    nowMs: 5000,
  });
  assert.equal(next.mode, "active");
});

test("stepGpsDutyCycle enters stationary after dwell in inner zone", () => {
  const t0 = 1_000_000;
  let state = INITIAL_GPS_DUTY_CYCLE_STATE;
  state = stepGpsDutyCycle({
    state,
    lat: venue.lat,
    lng: venue.lng,
    isInnerZone: true,
    nowMs: t0,
  });
  assert.equal(state.mode, "active");

  state = stepGpsDutyCycle({
    state,
    lat: venue.lat,
    lng: venue.lng,
    isInnerZone: true,
    nowMs: t0 + GPS_DUTY_CYCLE_STATIONARY_INNER_MS,
  });
  assert.equal(state.mode, "stationary");
});

test("stepGpsDutyCycle bursts active on significant move from stationary anchor", () => {
  const anchorLat = venue.lat;
  const anchorLng = venue.lng;
  const burstLat = anchorLat + GPS_DUTY_CYCLE_BURST_MOVE_M / 111_000;

  const next = stepGpsDutyCycle({
    state: {
      mode: "stationary",
      anchorLat,
      anchorLng,
      anchorSinceMs: 1_000_000,
    },
    lat: burstLat,
    lng: anchorLng,
    isInnerZone: true,
    nowMs: 1_100_000,
  });
  assert.equal(next.mode, "active");
});

test("stepGpsDutyCycle resets anchor when drift exceeds stationary radius", () => {
  const t0 = 1_000_000;
  let state = stepGpsDutyCycle({
    state: INITIAL_GPS_DUTY_CYCLE_STATE,
    lat: venue.lat,
    lng: venue.lng,
    isInnerZone: true,
    nowMs: t0,
  });
  const driftLat = venue.lat + (GPS_DUTY_CYCLE_STATIONARY_RADIUS_M + 2) / 111_000;
  state = stepGpsDutyCycle({
    state,
    lat: driftLat,
    lng: venue.lng,
    isInnerZone: true,
    nowMs: t0 + 30_000,
  });
  assert.equal(state.mode, "active");
  assert.equal(state.anchorLat, driftLat);
});
