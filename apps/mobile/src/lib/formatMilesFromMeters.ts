/** PWA `formatMilesFromMeters` — checkpoint distance subtitle. */
export function formatMilesFromMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "";
  const miles = meters / 1609.344;
  if (miles < 0.1) return "<0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
