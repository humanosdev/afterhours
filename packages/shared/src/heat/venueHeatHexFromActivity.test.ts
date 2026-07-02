import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VENUE_HEAT_TIER_BREAKPOINTS,
  venueHeatHexFromActivity,
} from "./venueHeatTiers";

describe("venueHeatHexFromActivity", () => {
  it("returns Dead at zero", () => {
    assert.equal(venueHeatHexFromActivity(0), "#2A2A2A");
  });

  it("steps through six heat breakpoints", () => {
    assert.equal(venueHeatHexFromActivity(1), "#2F5EFF");
    assert.equal(venueHeatHexFromActivity(4), "#7A00FF");
    assert.equal(venueHeatHexFromActivity(9), "#FF2DBE");
    assert.equal(venueHeatHexFromActivity(16), "#FF6B00");
    assert.equal(venueHeatHexFromActivity(25), "#FF3300");
  });

  it("documents canonical tier floors", () => {
    assert.deepEqual(
      VENUE_HEAT_TIER_BREAKPOINTS.map((t) => t.minCombined),
      [0, 1, 4, 9, 16, 25]
    );
  });
});
