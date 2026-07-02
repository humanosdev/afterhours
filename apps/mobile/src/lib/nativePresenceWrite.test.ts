import assert from "node:assert/strict";
import test from "node:test";
import {
  NATIVE_PRESENCE_WRITE_MAP_MS,
  NATIVE_PRESENCE_WRITE_MOVE_MIN_MS,
  NATIVE_PRESENCE_WRITE_MOVE_THRESHOLD_M,
  shouldWritePresenceForFix,
} from "./nativePresenceWrite";

test("shouldWritePresenceForFix allows first write", () => {
  assert.equal(
    shouldWritePresenceForFix({
      fix: { lat: 39.95, lng: -75.16 },
      lastWritten: null,
      lastWriteAtMs: 0,
      heartbeatMs: NATIVE_PRESENCE_WRITE_MAP_MS,
      nowMs: 10_000,
    }),
    true
  );
});

test("shouldWritePresenceForFix heartbeat when stationary", () => {
  const t0 = 10_000;
  assert.equal(
    shouldWritePresenceForFix({
      fix: { lat: 39.95, lng: -75.16 },
      lastWritten: { lat: 39.95, lng: -75.16 },
      lastWriteAtMs: t0,
      heartbeatMs: NATIVE_PRESENCE_WRITE_MAP_MS,
      nowMs: t0 + NATIVE_PRESENCE_WRITE_MAP_MS,
    }),
    true
  );
});

test("shouldWritePresenceForFix movement burst before heartbeat", () => {
  const t0 = 10_000;
  assert.equal(
    shouldWritePresenceForFix({
      fix: { lat: 39.95, lng: -75.16 },
      lastWritten: { lat: 39.95, lng: -75.16 },
      lastWriteAtMs: t0,
      heartbeatMs: NATIVE_PRESENCE_WRITE_MAP_MS,
      nowMs: t0 + 500,
    }),
    false
  );

  assert.equal(
    shouldWritePresenceForFix({
      fix: { lat: 39.951, lng: -75.16 },
      lastWritten: { lat: 39.95, lng: -75.16 },
      lastWriteAtMs: t0,
      heartbeatMs: NATIVE_PRESENCE_WRITE_MAP_MS,
      nowMs: t0 + NATIVE_PRESENCE_WRITE_MOVE_MIN_MS,
    }),
    true
  );
});

test("shouldWritePresenceForFix ignores jitter below threshold", () => {
  const t0 = 10_000;
  assert.equal(
    shouldWritePresenceForFix({
      fix: { lat: 39.95001, lng: -75.16 },
      lastWritten: { lat: 39.95, lng: -75.16 },
      lastWriteAtMs: t0,
      heartbeatMs: NATIVE_PRESENCE_WRITE_MAP_MS,
      nowMs: t0 + NATIVE_PRESENCE_WRITE_MOVE_MIN_MS + 100,
    }),
    false
  );
  assert.ok(NATIVE_PRESENCE_WRITE_MOVE_THRESHOLD_M >= 8);
});
