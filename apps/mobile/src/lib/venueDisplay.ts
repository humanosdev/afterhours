import type { VenuePublic } from "../types/venue";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All types",
  nightlife: "Nightlife",
  campus: "Campus",
  food: "Food & drink",
  events: "Events",
};

/**
 * Short label for venue chips / list subtitles (web uses same category keys in places).
 */
export function formatVenueCategoryLabel(category: string | null | undefined): string {
  const raw = category?.trim();
  if (!raw) return "Intencity spot";
  const key = raw.toLowerCase();
  return CATEGORY_LABELS[key] ?? raw;
}

/** Second line under venue name on Hub chips. */
export function venueChipMeta(venue: VenuePublic): string {
  return formatVenueCategoryLabel(venue.category);
}
