import assert from "node:assert/strict";
import test from "node:test";
import { FRIEND_ONLINE_BADGE_MS } from "@intencity/shared";
import { computeMapPresenceMarkers } from "./mapPresenceMarkers";
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

const T0 = Date.parse("2026-06-05T12:00:00.000Z");

function friendRow(overrides: Partial<UserPresenceRow> = {}): UserPresenceRow {
  return {
    user_id: "friend",
    lat: 39.95,
    lng: -75.16,
    venue_id: "v1",
    zone_type: "inner",
    venue_state: "inner_pending",
    entered_inner_at: new Date(T0 - 30_000).toISOString(),
    updated_at: new Date(T0 - 3 * 60_000).toISOString(),
    ...overrides,
  };
}

test("venue cluster shows in-venue friend without inner dwell or online-now gate (PWA parity)", () => {
  const { venueClusters, friendMarkers } = computeMapPresenceMarkers({
    venues: [venue],
    presence: [friendRow()],
    friends: [{ id: "friend", label: "Alex", avatar_url: "https://example.com/a.jpg" }],
    meId: "me",
    myLabel: "You",
    myAvatarUrl: null,
    myGhostMode: false,
    ghostByUserId: {},
    youCoords: null,
    nowMs: T0,
  });

  assert.equal(friendMarkers.length, 0);
  assert.equal(venueClusters.length, 1);
  assert.equal(venueClusters[0]?.totalCount, 1);
  assert.equal(venueClusters[0]?.members.length, 1);
  assert.equal(venueClusters[0]?.members[0]?.userId, "friend");
  assert.equal(venueClusters[0]?.members[0]?.avatarUrl, "https://example.com/a.jpg");
});

test("venue cluster omits ghost friend avatar but keeps heat count slot", () => {
  const { venueClusters } = computeMapPresenceMarkers({
    venues: [venue],
    presence: [friendRow()],
    friends: [{ id: "friend", label: "Alex", avatar_url: null }],
    meId: "me",
    myLabel: "You",
    myAvatarUrl: null,
    myGhostMode: false,
    ghostByUserId: { friend: true },
    youCoords: null,
    nowMs: T0,
  });

  assert.equal(venueClusters.length, 0);
});

test("venue cluster still shows friend beyond online-now badge window when map-live", () => {
  const updatedAt = new Date(T0 - FRIEND_ONLINE_BADGE_MS - 30_000).toISOString();
  const { venueClusters } = computeMapPresenceMarkers({
    venues: [venue],
    presence: [friendRow({ updated_at: updatedAt, venue_state: "inner_confirmed" })],
    friends: [{ id: "friend", label: "Alex", avatar_url: null }],
    meId: "me",
    myLabel: "You",
    myAvatarUrl: null,
    myGhostMode: false,
    ghostByUserId: {},
    youCoords: null,
    nowMs: T0,
  });

  assert.equal(venueClusters.length, 1);
  assert.equal(venueClusters[0]?.members[0]?.userId, "friend");
});
