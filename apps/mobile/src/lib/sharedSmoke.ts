import { isValidCoordinatePair, MAP_ACTIVITY_WINDOW_MS } from "@intencity/shared";

/** Phase 2B: proves Metro resolves @intencity/shared — not used for presence writes. */
export function getSharedSmokeSummary() {
  const sampleValid = isValidCoordinatePair(39.9526, -75.1636);
  return {
    mapActivityWindowMs: MAP_ACTIVITY_WINDOW_MS,
    sampleValid,
  };
}
