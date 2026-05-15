import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { venueHeatHexFromActivity } from "./venueHeatHexFromActivity";

describe("venueHeatHexFromActivity", () => {
  it("returns neutral at zero", () => {
    assert.equal(venueHeatHexFromActivity(0), "#7c8aa0");
  });

  it("steps through heat breakpoints", () => {
    assert.equal(venueHeatHexFromActivity(1), "#7dd3fc");
    assert.equal(venueHeatHexFromActivity(4), "#14b8a6");
    assert.equal(venueHeatHexFromActivity(9), "#ff2ea6");
    assert.equal(venueHeatHexFromActivity(16), "#1F52F5");
  });
});
