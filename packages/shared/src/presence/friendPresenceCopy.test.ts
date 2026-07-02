import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FRIEND_ONLINE_BADGE_MS, INNER_CONFIRM_MS, MAP_ACTIVITY_WINDOW_MS, RECENT_WINDOW_MS } from "./constants";
import { getFriendPresenceCopy, formatProfileVenuePillLabel } from "./friendPresenceCopy";

const T0 = Date.parse("2026-05-15T12:00:00.000Z");

const VENUES = [
  {
    id: "v1",
    name: "Rittenhouse",
    lat: 39.9496,
    lng: -75.171,
    inner_radius_m: 80,
    outer_radius_m: 200,
  },
];

describe("getFriendPresenceCopy", () => {
  it("returns ghost copy", () => {
    const r = getFriendPresenceCopy(
      { ghostMode: true, updatedAt: new Date(T0).toISOString(), surface: "hub" },
      T0
    );
    assert.equal(r.copy, "Hiding location");
    assert.equal(r.liveAtVenue, false);
  });

  it("hub online inside uses generic venue label", () => {
    const updatedAt = new Date(T0 - 30_000).toISOString();
    const enteredInnerAt = new Date(T0 - INNER_CONFIRM_MS - 1000).toISOString();
    const r = getFriendPresenceCopy(
      {
        updatedAt,
        lat: 39.9496,
        lng: -75.171,
        venueState: "inner_confirmed",
        enteredInnerAt,
        venues: VENUES,
        surface: "hub",
      },
      T0
    );
    assert.equal(r.copy, "At a venue");
    assert.equal(r.liveAtVenue, true);
  });

  it("profile online inside uses venue name", () => {
    const updatedAt = new Date(T0 - 30_000).toISOString();
    const enteredInnerAt = new Date(T0 - INNER_CONFIRM_MS - 1000).toISOString();
    const r = getFriendPresenceCopy(
      {
        updatedAt,
        lat: 39.9496,
        lng: -75.171,
        venueState: "inner_confirmed",
        enteredInnerAt,
        venues: VENUES,
        surface: "profile",
      },
      T0
    );
    assert.equal(r.copy, "At Rittenhouse");
    assert.equal(r.liveAtVenue, true);
  });

  it("live tier uses away copy", () => {
    const updatedAt = new Date(T0 - FRIEND_ONLINE_BADGE_MS - 60_000).toISOString();
    const r = getFriendPresenceCopy(
      {
        updatedAt,
        lat: 39.9496,
        lng: -75.171,
        venues: VENUES,
        fallbackVenueName: "Rittenhouse",
        surface: "profile",
      },
      T0
    );
    assert.match(r.copy, /^Away · At /);
    assert.equal(r.liveAtVenue, false);
  });

  it("offline profile returns not at a venue", () => {
    const updatedAt = new Date(T0 - RECENT_WINDOW_MS - 1000).toISOString();
    const r = getFriendPresenceCopy({ updatedAt, surface: "profile" }, T0);
    assert.equal(r.copy, "Not at a venue");
  });
});

describe("formatProfileVenuePillLabel", () => {
  it("transforms recently at to last at", () => {
    assert.equal(formatProfileVenuePillLabel("Recently at Rittenhouse"), "Last at Rittenhouse");
  });
});
