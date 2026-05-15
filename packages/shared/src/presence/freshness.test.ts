import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FRIEND_ONLINE_BADGE_MS,
  MAP_ACTIVITY_WINDOW_MS,
  RECENT_WINDOW_MS,
} from "./constants";
import {
  getPresenceFreshness,
  isFriendOnlineNow,
  isPresenceLive,
  isPresenceRecent,
} from "./freshness";

const T0 = Date.parse("2026-05-15T12:00:00.000Z");

describe("getPresenceFreshness", () => {
  it("returns stale when updatedAt is missing", () => {
    assert.equal(getPresenceFreshness(null, T0), "stale");
  });

  it("returns live within MAP_ACTIVITY_WINDOW_MS", () => {
    const updatedAt = new Date(T0 - MAP_ACTIVITY_WINDOW_MS + 1).toISOString();
    assert.equal(getPresenceFreshness(updatedAt, T0), "live");
  });

  it("returns recent between map activity and recent windows", () => {
    const updatedAt = new Date(T0 - MAP_ACTIVITY_WINDOW_MS - 1).toISOString();
    assert.equal(getPresenceFreshness(updatedAt, T0), "recent");
  });

  it("returns stale after RECENT_WINDOW_MS", () => {
    const updatedAt = new Date(T0 - RECENT_WINDOW_MS - 1).toISOString();
    assert.equal(getPresenceFreshness(updatedAt, T0), "stale");
  });
});

describe("isFriendOnlineNow", () => {
  it("is true within FRIEND_ONLINE_BADGE_MS", () => {
    const updatedAt = new Date(T0 - FRIEND_ONLINE_BADGE_MS + 1).toISOString();
    assert.equal(isFriendOnlineNow(updatedAt, T0), true);
  });

  it("is false beyond FRIEND_ONLINE_BADGE_MS", () => {
    const updatedAt = new Date(T0 - FRIEND_ONLINE_BADGE_MS - 1).toISOString();
    assert.equal(isFriendOnlineNow(updatedAt, T0), false);
  });
});

describe("isPresenceLive / isPresenceRecent", () => {
  it("live and recent are mutually exclusive tiers", () => {
    const liveAt = new Date(T0 - 60_000).toISOString();
    assert.equal(isPresenceLive(liveAt, T0), true);
    assert.equal(isPresenceRecent(liveAt, T0), false);

    const recentAt = new Date(T0 - MAP_ACTIVITY_WINDOW_MS - 60_000).toISOString();
    assert.equal(isPresenceLive(recentAt, T0), false);
    assert.equal(isPresenceRecent(recentAt, T0), true);
  });
});
