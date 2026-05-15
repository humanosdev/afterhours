import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceMeters } from "./distanceMeters";

describe("distanceMeters", () => {
  it("returns 0 for identical points", () => {
    assert.equal(distanceMeters(40.0, -75.0, 40.0, -75.0), 0);
  });

  it("matches a known short hop (~111m per 0.001° latitude)", () => {
    const d = distanceMeters(40.0, -75.0, 40.001, -75.0);
    assert.ok(d > 100 && d < 125, `expected ~111m, got ${d}`);
  });
});
