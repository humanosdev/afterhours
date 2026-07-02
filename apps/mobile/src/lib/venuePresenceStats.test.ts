import assert from "node:assert/strict";
import test from "node:test";
import { getCountsForVenue } from "./venuePresenceStats";
import type { UserPresenceRow } from "../types/presence";
import type { VenuePublic } from "../types/venue";

const venue: VenuePublic = {
  id: "v1",
  name: "Test Bar",
  category: "bar",
  lat: 39.95,
  lng: -75.16,
  inner_radius_m: 80,
  outer_radius_m: 200,
};

const meRow: UserPresenceRow = {
  user_id: "me",
  lat: 39.95,
  lng: -75.16,
  venue_id: "v1",
  zone_type: "inner",
  venue_state: "inner_confirmed",
  entered_inner_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

test("getCountsForVenue excludes self even when ghost mode is on", () => {
  const counts = getCountsForVenue(
    "v1",
    [meRow],
    new Set<string>(),
    [venue],
    "me",
    {},
    Date.now(),
    new Set(),
    true
  );
  assert.equal(counts.insideTotal, 0);
  assert.equal(counts.nearbyTotal, 0);
});

test("getCountsForVenue includes friend ghost as anonymous heat", () => {
  const friendRow: UserPresenceRow = {
    ...meRow,
    user_id: "friend",
  };
  const counts = getCountsForVenue(
    "v1",
    [friendRow],
    new Set(["friend"]),
    [venue],
    "me",
    { friend: true },
    Date.now()
  );
  assert.equal(counts.insideTotal, 1);
  assert.equal(counts.insideFriends, 0);
});
