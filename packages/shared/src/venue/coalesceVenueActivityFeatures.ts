import { venueHeatHexFromActivity } from "../heat/venueHeatTiers";

export type VenueActivityFeatureProperties = {
  combined_count?: number;
  inside_count?: number;
  nearby_count?: number;
  checkpoint_active?: number;
  checkpoint_pulse?: number;
  ambient_pulse?: number;
  heat_color?: string;
  [key: string]: unknown;
};

export type VenueActivityGeoFeature<
  P extends VenueActivityFeatureProperties = VenueActivityFeatureProperties,
> = {
  type: "Feature";
  id?: string;
  properties: P;
  geometry: { type: "Point"; coordinates: [number, number] };
};

/** ~1.1 m grouping — venues stacked on the same pin share one glow/heatmap point. */
export function venueActivityCoordinateKey(lng: number, lat: number, precision = 5): string {
  return `${lng.toFixed(precision)}:${lat.toFixed(precision)}`;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Merge co-located venue activity features so circle/heatmap layers do not stack
 * opacity at the same coordinate (which reads as an artificially darker tier).
 */
export function coalesceOverlappingVenueActivityFeatures<
  P extends VenueActivityFeatureProperties,
>(features: VenueActivityGeoFeature<P>[]): VenueActivityGeoFeature<P>[] {
  const groups = new Map<string, VenueActivityGeoFeature<P>[]>();

  for (const feature of features) {
    const [lng, lat] = feature.geometry.coordinates;
    const key = venueActivityCoordinateKey(lng, lat);
    const bucket = groups.get(key) ?? [];
    bucket.push(feature);
    groups.set(key, bucket);
  }

  const out: VenueActivityGeoFeature<P>[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }

    const winner = group.reduce((best, f) =>
      num(f.properties.combined_count) > num(best.properties.combined_count) ? f : best
    );

    const combined = Math.max(...group.map((f) => num(f.properties.combined_count)));
    const inside = Math.max(...group.map((f) => num(f.properties.inside_count)));
    const nearby = Math.max(...group.map((f) => num(f.properties.nearby_count)));
    const checkpointPulse = Math.max(...group.map((f) => num(f.properties.checkpoint_pulse)));
    const checkpointActive = group.some((f) => num(f.properties.checkpoint_active) === 1) ? 1 : 0;

    out.push({
      ...winner,
      properties: {
        ...winner.properties,
        combined_count: combined,
        inside_count: inside,
        nearby_count: nearby,
        checkpoint_active: checkpointActive,
        checkpoint_pulse: checkpointPulse,
        heat_color: venueHeatHexFromActivity(combined),
      },
    });
  }

  return out;
}
