import assert from "node:assert/strict";
import test from "node:test";
import { acceptDeviceFix, MAX_DEVICE_ACCURACY_M, MAX_TELEPORT_SPEED_MPS } from "./deviceLocationFilters";

test("acceptDeviceFix rejects poor accuracy", () => {
  assert.equal(
    acceptDeviceFix(
      { lat: 39.95, lng: -75.16, accuracyM: MAX_DEVICE_ACCURACY_M + 1, recordedAtMs: 1000 },
      null
    ),
    false
  );
});

test("acceptDeviceFix rejects teleport jumps", () => {
  const prev = { lat: 39.95, lng: -75.16, accuracyM: 10, recordedAtMs: 0 };
  const next = {
    lat: 40.05,
    lng: -75.16,
    accuracyM: 10,
    recordedAtMs: 1000,
  };
  const distM = 11132;
  const speedMps = distM / 1;
  assert.ok(speedMps > MAX_TELEPORT_SPEED_MPS);
  assert.equal(acceptDeviceFix(next, prev), false);
});

test("acceptDeviceFix accepts realistic walking pace", () => {
  const prev = { lat: 39.95, lng: -75.16, accuracyM: 12, recordedAtMs: 0 };
  const next = { lat: 39.95005, lng: -75.16, accuracyM: 12, recordedAtMs: 5000 };
  assert.equal(acceptDeviceFix(next, prev), true);
});
