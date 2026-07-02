import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROFILE_VENUE_DWELL_MS } from "../presence/constants";
import { hasProfileVenueDwell } from "./profileVenueDwell";

describe("hasProfileVenueDwell", () => {
  const venueId = "11111111-1111-1111-1111-111111111111";
  const nowMs = 1_700_000_000_000;

  it("requires inner zone", () => {
    assert.equal(
      hasProfileVenueDwell({
        zoneType: "outer",
        venueId,
        enteredInnerAt: new Date(nowMs - PROFILE_VENUE_DWELL_MS - 1).toISOString(),
        nowMs,
      }),
      false
    );
  });

  it("requires 15+ minutes in inner zone", () => {
    const entered = new Date(nowMs - PROFILE_VENUE_DWELL_MS + 1_000).toISOString();
    assert.equal(
      hasProfileVenueDwell({ zoneType: "inner", venueId, enteredInnerAt: entered, nowMs }),
      false
    );
    const earned = new Date(nowMs - PROFILE_VENUE_DWELL_MS).toISOString();
    assert.equal(
      hasProfileVenueDwell({ zoneType: "inner", venueId, enteredInnerAt: earned, nowMs }),
      true
    );
  });
});
