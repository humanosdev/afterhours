/**
 * Heat ramp for venue activity (inside + nearby). Matches map `venueCombinedActivityToHeatHex`.
 * At zero activity, tint stays cool/neutral — not category purple.
 */
export { venueHeatHexFromActivity } from "@intencity/shared";

/*
 * Phase 1B-medium transition — pre-shim inline (99eb49f parity reference):
 *
 * export function venueHeatHexFromActivity(activity: number): string {
 *   const n = Math.max(0, Math.round(Number.isFinite(activity) ? activity : 0));
 *   if (n >= 16) return "#1F52F5";
 *   if (n >= 9) return "#ff2ea6";
 *   if (n >= 4) return "#14b8a6";
 *   if (n >= 1) return "#7dd3fc";
 *   return "#7c8aa0";
 * }
 */
