import assert from "node:assert/strict";
import test from "node:test";
import { INNER_CONFIRM_MS } from "@intencity/shared";
import { computeMyVenuePresence } from "./myVenuePresence";
import { stepLocalPresencePreview } from "./localPresencePreview";
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

const coords = { lat: 39.95, lng: -75.16, accuracyM: 10, recordedAtMs: Date.now() };

test("stepLocalPresencePreview restores inner_confirmed from boot on cold open", () => {
  const entered = new Date(Date.now() - INNER_CONFIRM_MS - 5_000).toISOString();
  const stepped = stepLocalPresencePreview({
    coords,
    venues: [venue],
    fsm: { venueState: "outside", enteredInnerAt: null },
    bootFsm: { venueState: "inner_confirmed", enteredInnerAt: entered },
  });

  assert.ok(stepped.preview);
  assert.equal(stepped.preview!.venueState, "inner_confirmed");
  assert.equal(stepped.preview!.isSettlingHere, false);
  assert.equal(stepped.preview!.isLiveHere, true);
});

test("computeMyVenuePresence prefers DB confirmed over local arriving", () => {
  const row: UserPresenceRow = {
    user_id: "me",
    lat: 39.95,
    lng: -75.16,
    venue_id: "v1",
    zone_type: "inner",
    venue_state: "inner_confirmed",
    entered_inner_at: new Date(Date.now() - INNER_CONFIRM_MS - 5_000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const result = computeMyVenuePresence({
    userId: "me",
    ghostMode: false,
    presence: [row],
    venues: [venue],
    localPreview: {
      venueId: "v1",
      zoneType: "inner",
      venueState: "inner_pending",
      enteredInnerAt: new Date().toISOString(),
      venue,
      isSettlingHere: true,
      isLiveHere: false,
      isAtVenue: true,
      zoneLabel: "arriving",
    },
  });

  assert.equal(result.isSettlingHere, false);
  assert.equal(result.isLiveHere, true);
  assert.equal(result.headline, "At Test Bar");
});
