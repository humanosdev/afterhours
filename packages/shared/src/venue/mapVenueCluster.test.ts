import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INNER_CONFIRM_MS } from "../presence/constants";
import {
  hasInnerClusterDwell,
  hasNearbyClusterDwell,
  NEARBY_CLUSTER_DWELL_MS,
  resolvePresenceVenueZone,
} from "./mapVenueCluster";

const T0 = 1_700_000_000_000;
const VENUES = [
  {
    id: "v1",
    lat: 40,
    lng: -75,
    inner_radius_m: 80,
    outer_radius_m: 200,
  },
];

describe("resolvePresenceVenueZone", () => {
  it("prefers inner over outer", () => {
    const r = resolvePresenceVenueZone({ lat: 40.0005, lng: -75 }, VENUES);
    assert.equal(r?.venueId, "v1");
    assert.equal(r?.zone, "inner");
  });

  it("returns outer when between inner and outer radii", () => {
    const r = resolvePresenceVenueZone({ lat: 40.0015, lng: -75 }, VENUES);
    assert.equal(r?.zone, "outer");
  });

  it("returns null outside outer", () => {
    assert.equal(resolvePresenceVenueZone({ lat: 40.01, lng: -75 }, VENUES), null);
  });
});

describe("cluster dwell gates", () => {
  it("inner_confirmed qualifies immediately", () => {
    assert.equal(
      hasInnerClusterDwell({ zone: "inner", venueState: "inner_confirmed", nowMs: T0 }),
      true
    );
  });

  it("inner_pending qualifies after INNER_CONFIRM_MS", () => {
    const entered = new Date(T0 - INNER_CONFIRM_MS).toISOString();
    assert.equal(
      hasInnerClusterDwell({
        zone: "inner",
        venueState: "inner_pending",
        enteredInnerAt: entered,
        nowMs: T0,
      }),
      true
    );
    assert.equal(
      hasInnerClusterDwell({
        zone: "inner",
        venueState: "inner_pending",
        enteredInnerAt: new Date(T0 - INNER_CONFIRM_MS + 1000).toISOString(),
        nowMs: T0,
      }),
      false
    );
  });

  it("nearby requires outer zone dwell", () => {
    assert.equal(
      hasNearbyClusterDwell({
        zone: "outer",
        clientOuterSinceMs: T0 - NEARBY_CLUSTER_DWELL_MS,
        nowMs: T0,
      }),
      true
    );
    assert.equal(
      hasNearbyClusterDwell({
        zone: "inner",
        clientOuterSinceMs: T0 - NEARBY_CLUSTER_DWELL_MS,
        nowMs: T0,
      }),
      false
    );
  });
});
