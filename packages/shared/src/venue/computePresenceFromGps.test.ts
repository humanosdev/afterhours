import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INNER_CONFIRM_MS } from "../presence/constants";
import { computePresenceFromGps } from "./computePresenceFromGps";
import type { VenueForPresenceSync } from "./types";

const T0 = Date.parse("2026-05-15T12:00:00.000Z");

const venueA: VenueForPresenceSync = {
  id: "a",
  name: "A",
  lat: 40.0,
  lng: -75.0,
  inner_radius_m: 30,
  outer_radius_m: 100,
  halo_radius_m: null,
};

const venueB: VenueForPresenceSync = {
  id: "b",
  name: "B",
  lat: 40.0003,
  lng: -75.0003,
  inner_radius_m: 30,
  outer_radius_m: 100,
  halo_radius_m: null,
};

describe("computePresenceFromGps zone selection", () => {
  it("picks inner when inside inner radius", () => {
    const r = computePresenceFromGps({
      lat: 40.0,
      lng: -75.0,
      venues: [venueA],
      nowMs: T0,
    });
    assert.equal(r.venueId, "a");
    assert.equal(r.zoneType, "inner");
    assert.equal(r.venueState, "inner_pending");
    assert.ok(r.enteredInnerAt);
  });

  it("picks closest venue when overlapping outer zones", () => {
    const r = computePresenceFromGps({
      lat: 40.0001,
      lng: -75.0001,
      venues: [venueA, venueB],
      prevVenueState: "outside",
      nowMs: T0,
    });
    assert.equal(r.venueId, "a");
    assert.equal(r.zoneType, "inner");
  });

  it("uses outer when outside inner but inside outer", () => {
    // ~55m north — inside outer (100m) but outside inner (30m)
    const r = computePresenceFromGps({
      lat: 40.0005,
      lng: -75.0,
      venues: [venueA],
      prevVenueState: "outside",
      nowMs: T0,
    });
    assert.equal(r.zoneType, "outer");
    assert.equal(r.venueId, "a");
  });

  it("uses halo when outside outer but inside halo limit", () => {
    const farVenue: VenueForPresenceSync = {
      ...venueA,
      id: "far",
      outer_radius_m: 50,
      halo_radius_m: 200,
    };
    const r = computePresenceFromGps({
      lat: 40.0012,
      lng: -75.0,
      venues: [farVenue],
      prevVenueState: "outside",
      nowMs: T0,
    });
    assert.equal(r.zoneType, "halo");
    assert.equal(r.venueId, "far");
  });
});

describe("computePresenceFromGps state machine", () => {
  it("stays inner_pending before INNER_CONFIRM_MS", () => {
    const entered = new Date(T0 - INNER_CONFIRM_MS + 1000).toISOString();
    const r = computePresenceFromGps({
      lat: 40.0,
      lng: -75.0,
      venues: [venueA],
      prevVenueState: "inner_pending",
      prevEnteredInnerAt: entered,
      nowMs: T0,
    });
    assert.equal(r.venueState, "inner_pending");
  });

  it("becomes inner_confirmed at INNER_CONFIRM_MS", () => {
    const entered = new Date(T0 - INNER_CONFIRM_MS).toISOString();
    const r = computePresenceFromGps({
      lat: 40.0,
      lng: -75.0,
      venues: [venueA],
      prevVenueState: "inner_pending",
      prevEnteredInnerAt: entered,
      nowMs: T0,
    });
    assert.equal(r.venueState, "inner_confirmed");
  });

  it("resets to outside when leaving inner zone", () => {
    const r = computePresenceFromGps({
      lat: 41.0,
      lng: -76.0,
      venues: [venueA],
      prevVenueState: "inner_confirmed",
      prevEnteredInnerAt: new Date(T0 - 120_000).toISOString(),
      nowMs: T0,
    });
    assert.equal(r.venueState, "outside");
    assert.equal(r.enteredInnerAt, null);
    assert.equal(r.venueId, null);
  });
});
