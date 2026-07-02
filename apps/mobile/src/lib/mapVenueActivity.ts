import {
  coalesceOverlappingVenueActivityFeatures,
  venueHeatColorStepExpression,
  venueHeatHexFromActivity,
  venueHeatmapColorExpression,
} from "@intencity/shared";
import { getCountsForVenue } from "./venuePresenceStats";
import type { UserPresenceRow } from "../types/presence";
import type { VenuePublic } from "../types/venue";

export type VenueActivityProperties = {
  venueId: string;
  name: string;
  combined_count: number;
  inside_count: number;
  nearby_count: number;
  checkpoint_active: number;
  checkpoint_pulse: number;
  ambient_pulse: number;
  heat_color: string;
};

/** Grey-tier footprint for every color tier — pulse bumps only. */
const venueGlowSizeWeight = [
  "+",
  0,
  ["*", 6, ["coalesce", ["get", "checkpoint_pulse"], 0]],
  ["*", 1.8, ["coalesce", ["get", "ambient_pulse"], 0]],
] as const;

/** PWA `VENUE_GLOW_LAYER` `circle-radius` — zero-activity size at all tiers. */
export const venueGlowCircleRadiusStyle = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0,
  ["interpolate", ["linear"], venueGlowSizeWeight, 0, 2, 6, 6, 15, 10, 30, 13],
  8,
  ["interpolate", ["linear"], venueGlowSizeWeight, 0, 10, 6, 20, 15, 28, 30, 34],
  14,
  ["interpolate", ["linear"], venueGlowSizeWeight, 0, 42, 2, 58, 6, 90, 11, 130, 17, 185, 25, 240],
] as const;

/** PWA `VENUE_GLOW_LAYER` `circle-opacity` — grey zoom ramp for every tier. */
export const venueGlowCircleOpacityStyle = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.12,
  14,
  0.28,
] as const;

/** Tier colors — `VENUE_HEAT_TIER_BREAKPOINTS` step on `combined_count`. */
export const venueGlowColorStyle = venueHeatColorStepExpression() as readonly unknown[];

/** PWA venue core radius weight — hit parity layer (opacity 0). */
const venueCoreActivityWeight = [
  "+",
  ["coalesce", ["get", "combined_count"], 0],
  ["*", 3, ["coalesce", ["get", "checkpoint_pulse"], 0]],
  ["*", 0.9, ["coalesce", ["get", "ambient_pulse"], 0]],
] as const;

/** PWA `VENUE_CORE_LAYER` `circle-radius` (layer opacity is 0 — kept for hit parity). */
export const venueCoreCircleRadiusStyle = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0,
  ["interpolate", ["linear"], venueCoreActivityWeight, 0, 1, 10, 4, 25, 6],
  8,
  ["interpolate", ["linear"], venueCoreActivityWeight, 0, 4, 10, 8, 25, 12],
  14,
  ["interpolate", ["linear"], venueCoreActivityWeight, 0, 10, 2, 14, 6, 20, 11, 28, 17, 36, 25, 44],
] as const;

/** PWA `venues-activity-source` feature rows — same counts as heat/glow layers. */
export function buildVenueActivityGeoJson(args: {
  venues: VenuePublic[];
  presence: UserPresenceRow[];
  friendIds: Set<string>;
  meId: string | null;
  ghostByUserId: Record<string, boolean>;
  blockedUserIds?: Set<string>;
  activeCheckpointId: string | null;
  /** PWA `checkpoint_pulse` 0→1 over 1600ms on checkpoint arrival. */
  arrivalPulseVenueId?: string | null;
  arrivalPulseUntilMs?: number;
  nowMs?: number;
  myGhostMode?: boolean;
}) {
  const {
    venues,
    presence,
    friendIds,
    meId,
    ghostByUserId,
    blockedUserIds = new Set(),
    activeCheckpointId,
    arrivalPulseVenueId = null,
    arrivalPulseUntilMs = 0,
    nowMs = Date.now(),
    myGhostMode = false,
  } = args;

  const features: {
    type: "Feature";
    id: string;
    properties: VenueActivityProperties;
    geometry: { type: "Point"; coordinates: [number, number] };
  }[] = [];

  for (const v of venues) {
    if (v.lat == null || v.lng == null) continue;
    const { insideTotal, nearbyTotal } = getCountsForVenue(
      v.id,
      presence,
      friendIds,
      venues,
      meId,
      ghostByUserId,
      nowMs,
      blockedUserIds,
      myGhostMode
    );
    const combined = insideTotal + nearbyTotal;
    const pulseProgress =
      arrivalPulseVenueId === v.id && nowMs < arrivalPulseUntilMs
        ? Math.max(0, (arrivalPulseUntilMs - nowMs) / 1600)
        : 0;
    features.push({
      type: "Feature",
      id: v.id,
      properties: {
        venueId: v.id,
        name: v.name,
        combined_count: combined,
        inside_count: insideTotal,
        nearby_count: nearbyTotal,
        checkpoint_active: activeCheckpointId === v.id ? 1 : 0,
        checkpoint_pulse: pulseProgress,
        ambient_pulse: 0,
        heat_color: venueHeatHexFromActivity(combined),
      },
      geometry: {
        type: "Point",
        coordinates: [v.lng, v.lat],
      },
    });
  }

  return {
    type: "FeatureCollection" as const,
    features: coalesceOverlappingVenueActivityFeatures(features),
  };
}

/** PWA heatmap color ramp (`venue-heat` layer). */
export const heatmapColorStyle = venueHeatmapColorExpression() as readonly unknown[];

/** PWA `heatmap-intensity` × global breathe wave (200ms tick). */
export function heatmapIntensityStyle(pulseWave: number) {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    10,
    0.6 * pulseWave,
    14,
    1.2 * pulseWave,
    18,
    2 * pulseWave,
  ] as const;
}

/** PWA `venue-heat` `heatmap-opacity` stops. */
export const heatmapOpacityStyle = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.5,
  12,
  0.4,
  14,
  0.28,
  15.5,
  0.16,
  17,
  0.06,
  18,
  0,
] as const;

/** PWA `venue-heat` `heatmap-radius` stops. */
export const heatmapRadiusStyle = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0,
  4,
  4,
  10,
  8,
  20,
  10,
  28,
  12,
  40,
  14,
  56,
  16,
  72,
  18,
  84,
] as const;
