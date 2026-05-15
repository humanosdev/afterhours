import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAP_FALLBACK_CENTER_LAT, MAP_FALLBACK_CENTER_LNG } from "./constants";
import { isLikelyMapFallbackPresence, isValidCoordinatePair } from "./coordinates";

describe("isValidCoordinatePair", () => {
  it("rejects non-finite and out-of-range", () => {
    assert.equal(isValidCoordinatePair(NaN, 0), false);
    assert.equal(isValidCoordinatePair(91, 0), false);
    assert.equal(isValidCoordinatePair(0, 181), false);
  });

  it("accepts in-range finite coords", () => {
    assert.equal(isValidCoordinatePair(40, -75), true);
  });
});

describe("isLikelyMapFallbackPresence", () => {
  it("matches map fallback center within epsilon", () => {
    assert.equal(
      isLikelyMapFallbackPresence(MAP_FALLBACK_CENTER_LAT, MAP_FALLBACK_CENTER_LNG),
      true
    );
  });

  it("does not match a real offset", () => {
    assert.equal(isLikelyMapFallbackPresence(40.5, -75.5), false);
  });
});
