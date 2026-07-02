import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKGROUND_PRESENCE_POLL_MS,
  CHAT_POLL_FALLBACK_MS,
  FOREGROUND_UNREAD_POLL_MS,
  HUB_PRESENCE_CLOCK_MS,
  HUB_PRESENCE_POLL_MS,
  LIVE_PLACES_PRESENCE_POLL_MS,
  MAP_PRESENCE_CLOCK_MS,
  MAP_PRESENCE_POLL_MS,
  REALTIME_HEALTHY_PRESENCE_POLL_MS,
  resolvePresenceRefreshPolicy,
} from "./backgroundReadPolicy";
import { MAP_PRESENCE_REFRESH_BOOST } from "./mapPresenceRefresh";

test("native Phase 3 poll targets", () => {
  assert.equal(HUB_PRESENCE_POLL_MS, 20_000);
  assert.equal(HUB_PRESENCE_CLOCK_MS, 10_000);
  assert.equal(MAP_PRESENCE_POLL_MS, 3_000);
  assert.equal(MAP_PRESENCE_CLOCK_MS, 10_000);
  assert.equal(BACKGROUND_PRESENCE_POLL_MS, 60_000);
  assert.equal(LIVE_PLACES_PRESENCE_POLL_MS, 20_000);
  assert.equal(CHAT_POLL_FALLBACK_MS, 15_000);
  assert.equal(FOREGROUND_UNREAD_POLL_MS, 15_000);
});

test("resolvePresenceRefreshPolicy foreground hub defaults", () => {
  const policy = resolvePresenceRefreshPolicy({ appForeground: true, mapBoost: null });
  assert.deepEqual(policy, { pollMs: HUB_PRESENCE_POLL_MS, clockMs: HUB_PRESENCE_CLOCK_MS });
});

test("resolvePresenceRefreshPolicy map boost", () => {
  const policy = resolvePresenceRefreshPolicy({
    appForeground: true,
    mapBoost: MAP_PRESENCE_REFRESH_BOOST,
  });
  assert.deepEqual(policy, { pollMs: MAP_PRESENCE_POLL_MS, clockMs: MAP_PRESENCE_CLOCK_MS });
});

test("resolvePresenceRefreshPolicy background", () => {
  const policy = resolvePresenceRefreshPolicy({
    appForeground: false,
    mapBoost: MAP_PRESENCE_REFRESH_BOOST,
  });
  assert.equal(policy.pollMs, BACKGROUND_PRESENCE_POLL_MS);
});

test("resolvePresenceRefreshPolicy realtime healthy uses health-check poll", () => {
  const hub = resolvePresenceRefreshPolicy({
    appForeground: true,
    mapBoost: null,
    realtimeHealthy: true,
  });
  assert.equal(hub.pollMs, REALTIME_HEALTHY_PRESENCE_POLL_MS);
  assert.equal(hub.clockMs, HUB_PRESENCE_CLOCK_MS);

  const map = resolvePresenceRefreshPolicy({
    appForeground: true,
    mapBoost: MAP_PRESENCE_REFRESH_BOOST,
    realtimeHealthy: true,
  });
  assert.equal(map.pollMs, REALTIME_HEALTHY_PRESENCE_POLL_MS);
  assert.equal(map.clockMs, MAP_PRESENCE_CLOCK_MS);
});
