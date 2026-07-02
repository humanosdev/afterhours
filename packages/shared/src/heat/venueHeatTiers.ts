/** Combined = inside + nearby. Ascending breakpoints (Mapbox `step` / canonical counts). */
export const VENUE_HEAT_TIER_BREAKPOINTS = [
  { minCombined: 0, id: "dead", label: "Dead", hex: "#2A2A2A" },
  { minCombined: 1, id: "low", label: "Low (Blue Star)", hex: "#2F5EFF" },
  { minCombined: 4, id: "medium", label: "Medium (Violet Star)", hex: "#7A00FF" },
  { minCombined: 9, id: "high", label: "High (Magenta Star)", hex: "#FF2DBE" },
  { minCombined: 16, id: "very_high", label: "Very High (Nova)", hex: "#FF6B00" },
  { minCombined: 25, id: "peak", label: "Peak (Supernova)", hex: "#FF3300" },
] as const;

/** Descending lookup (highest matching tier wins). */
const VENUE_HEAT_TIERS_DESC = [...VENUE_HEAT_TIER_BREAKPOINTS].reverse();

export function venueHeatHexFromActivity(activity: number): string {
  const n = Math.max(0, Math.round(Number.isFinite(activity) ? activity : 0));
  for (const tier of VENUE_HEAT_TIERS_DESC) {
    if (n >= tier.minCombined) return tier.hex;
  }
  return VENUE_HEAT_TIER_BREAKPOINTS[0].hex;
}

/** Mapbox `step` on `combined_count` — default Dead, then tier colors. */
export function venueHeatColorStepExpression(
  property: readonly unknown[] = ["coalesce", ["get", "combined_count"], 0]
): unknown[] {
  const expr: unknown[] = ["step", property, VENUE_HEAT_TIER_BREAKPOINTS[0].hex];
  for (let i = 1; i < VENUE_HEAT_TIER_BREAKPOINTS.length; i++) {
    const tier = VENUE_HEAT_TIER_BREAKPOINTS[i];
    expr.push(tier.minCombined, tier.hex);
  }
  return expr;
}

/** Heatmap density ramp — same palette, low density still faint Dead haze. */
export function venueHeatmapColorExpression(): unknown[] {
  return [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0,
    "rgba(42,42,42,0.08)",
    0.16,
    "#2F5EFF",
    0.36,
    "#7A00FF",
    0.56,
    "#FF2DBE",
    0.76,
    "#FF6B00",
    1,
    "#FF3300",
  ];
}
