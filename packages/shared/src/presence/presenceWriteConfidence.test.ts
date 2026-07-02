import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPresenceWriteConfidence,
  MAX_INNER_ATTACH_ACCURACY_M,
  ZONE_JITTER_HOLD_MS,
  type StableZoneSnapshot,
} from "./presenceWriteConfidence";
import type { ComputePresenceFromGpsResult, VenueForPresenceSync } from "../venue/types";

const T0 = Date.parse("2026-06-05T12:00:00.000Z");

const venue: VenueForPresenceSync = {
  id: "v1",
  name: "Test",
  lat: 39.95,
  lng: -75.16,
  inner_radius_m: 80,
  outer_radius_m: 200,
  halo_radius_m: null,
};

function computed(overrides: Partial<ComputePresenceFromGpsResult> = {}): ComputePresenceFromGpsResult {
  return {
    venueId: "v1",
    zoneType: "inner",
    venueState: "inner_pending",
    enteredInnerAt: new Date(T0 - 30_000).toISOString(),
    ...overrides,
  };
}

describe("applyPresenceWriteConfidence", () => {
  it("downgrades inner attach when accuracy is worse than inner threshold", () => {
    const { result } = applyPresenceWriteConfidence({
      computed: computed(),
      prev: null,
      accuracyM: MAX_INNER_ATTACH_ACCURACY_M + 10,
      lat: venue.lat,
      lng: venue.lng,
      venues: [venue],
      stableZone: null,
      nowMs: T0,
    });
    assert.equal(result.zoneType, "outer");
    assert.equal(result.venueState, "outside");
  });

  it("keeps inner attach when accuracy is good enough", () => {
    const { result } = applyPresenceWriteConfidence({
      computed: computed({ venueState: "inner_confirmed" }),
      prev: {
        venue_id: "v1",
        zone_type: "inner",
        venue_state: "inner_confirmed",
        entered_inner_at: new Date(T0 - 120_000).toISOString(),
        updated_at: new Date(T0 - 5_000).toISOString(),
      },
      accuracyM: MAX_INNER_ATTACH_ACCURACY_M,
      lat: venue.lat,
      lng: venue.lng,
      venues: [venue],
      stableZone: null,
      nowMs: T0,
    });
    assert.equal(result.zoneType, "inner");
    assert.equal(result.venueState, "inner_confirmed");
  });

  it("holds previous inner zone on rapid inner→outer flip", () => {
    const stable: StableZoneSnapshot = {
      venueId: "v1",
      zoneType: "inner",
      sinceMs: T0 - 4_000,
    };
    const { result } = applyPresenceWriteConfidence({
      computed: computed({ zoneType: "outer", venueState: "outside", enteredInnerAt: null }),
      prev: {
        venue_id: "v1",
        zone_type: "inner",
        venue_state: "inner_confirmed",
        entered_inner_at: new Date(T0 - 120_000).toISOString(),
        updated_at: new Date(T0 - 3_000).toISOString(),
      },
      accuracyM: 20,
      lat: venue.lat,
      lng: venue.lng,
      venues: [venue],
      stableZone: stable,
      nowMs: T0,
    });
    assert.equal(result.zoneType, "inner");
    assert.equal(result.venueState, "inner_confirmed");
  });

  it("allows inner→outer change after jitter hold window", () => {
    const stable: StableZoneSnapshot = {
      venueId: "v1",
      zoneType: "inner",
      sinceMs: T0 - ZONE_JITTER_HOLD_MS - 1_000,
    };
    const { result } = applyPresenceWriteConfidence({
      computed: computed({ zoneType: "outer", venueState: "outside", enteredInnerAt: null }),
      prev: {
        venue_id: "v1",
        zone_type: "inner",
        venue_state: "inner_confirmed",
        entered_inner_at: new Date(T0 - 120_000).toISOString(),
        updated_at: new Date(T0 - 1_000).toISOString(),
      },
      accuracyM: 20,
      lat: venue.lat,
      lng: venue.lng,
      venues: [venue],
      stableZone: stable,
      nowMs: T0,
    });
    assert.equal(result.zoneType, "outer");
  });
});
