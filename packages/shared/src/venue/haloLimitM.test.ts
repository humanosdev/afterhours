import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { haloLimitM } from "./haloLimitM";
import type { VenueForPresenceSync } from "./types";

describe("haloLimitM", () => {
  it("uses explicit halo_radius_m when set", () => {
    const v: VenueForPresenceSync = {
      id: "v",
      name: "V",
      lat: 0,
      lng: 0,
      inner_radius_m: 30,
      outer_radius_m: 100,
      halo_radius_m: 250,
    };
    assert.equal(haloLimitM(v), 250);
  });

  it("falls back to max(round(outer*1.35), outer+40)", () => {
    const v: VenueForPresenceSync = {
      id: "v",
      name: "V",
      lat: 0,
      lng: 0,
      inner_radius_m: 30,
      outer_radius_m: 100,
      halo_radius_m: null,
    };
    assert.equal(haloLimitM(v), 140);
  });
});
