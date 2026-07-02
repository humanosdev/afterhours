import assert from "node:assert/strict";
import test from "node:test";
import { isWithinQuietHours, parseClockToMinutes } from "./quietHours.js";

test("parseClockToMinutes", () => {
  assert.equal(parseClockToMinutes("22:00"), 22 * 60);
  assert.equal(parseClockToMinutes("07:30:00"), 7 * 60 + 30);
  assert.equal(parseClockToMinutes(""), null);
});

test("isWithinQuietHours same-day window", () => {
  const noon = new Date(2026, 4, 18, 12, 0, 0);
  assert.equal(isWithinQuietHours("11:00", "13:00", noon), true);
  assert.equal(isWithinQuietHours("13:00", "15:00", noon), false);
});

test("isWithinQuietHours overnight window", () => {
  const late = new Date(2026, 4, 18, 23, 0, 0);
  const early = new Date(2026, 4, 19, 6, 0, 0);
  const midday = new Date(2026, 4, 19, 12, 0, 0);
  assert.equal(isWithinQuietHours("22:00", "07:00", late), true);
  assert.equal(isWithinQuietHours("22:00", "07:00", early), true);
  assert.equal(isWithinQuietHours("22:00", "07:00", midday), false);
});
