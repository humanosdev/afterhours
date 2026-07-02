/**
 * Ported from `apps/web/src/lib/venueCategoryAccent.ts` — keep in sync with map filters/markers.
 */

export type VenueCategoryAccentKey = "all" | "nightlife" | "campus" | "food" | "events";

const DINING_PIN_CATEGORY_MATCHERS = [
  "food",
  "restaurant",
  "eat",
  "cafe",
  "dining",
  "bistro",
  "eatery",
  "grill",
  "kitchen",
  "coffee",
  "bakery",
];

export const CAMPUS_VENUE_NAME_SUBSTRINGS = [
  "ego hall",
  "johnson",
  "morgan",
  "pearson",
  "howard gittis",
  "gittis",
  "student center",
];

const CAMPUS_PIN_CATEGORY_MATCHERS = ["campus", "school", "university", "college", "dorm", "student center"];
const EVENTS_PIN_CATEGORY_MATCHERS = ["event", "music", "show", "concert", "festival", "party"];
const NIGHTLIFE_PIN_CATEGORY_MATCHERS = ["nightlife", "bar", "club", "lounge", "party"];

function isDiningVenueCategory(category: string | null | undefined) {
  const s = `${category ?? ""}`.toLowerCase();
  return DINING_PIN_CATEGORY_MATCHERS.some((token) => s.includes(token));
}

export function isCampusVenue(v: { category: string | null | undefined; name: string | null | undefined }) {
  const source = `${v.category ?? ""}`.toLowerCase();
  if (CAMPUS_PIN_CATEGORY_MATCHERS.some((token) => source.includes(token))) return true;
  const name = `${v.name ?? ""}`.toLowerCase();
  return CAMPUS_VENUE_NAME_SUBSTRINGS.some((fragment) => name.includes(fragment));
}

function isEventVenueCategory(category: string | null | undefined) {
  const s = `${category ?? ""}`.toLowerCase();
  return EVENTS_PIN_CATEGORY_MATCHERS.some((token) => s.includes(token));
}

function isNightlifeVenueCategory(category: string | null | undefined) {
  const s = `${category ?? ""}`.toLowerCase();
  return NIGHTLIFE_PIN_CATEGORY_MATCHERS.some((token) => s.includes(token));
}

export function resolveVenueCategoryAccentKey(v: {
  category: string | null | undefined;
  name: string | null | undefined;
}): VenueCategoryAccentKey {
  if (isCampusVenue(v)) return "campus";
  if (isDiningVenueCategory(v.category)) return "food";
  if (isEventVenueCategory(v.category)) return "events";
  if (isNightlifeVenueCategory(v.category)) return "nightlife";
  return "all";
}

export function venueCategoryAccentHex(key: VenueCategoryAccentKey): string {
  switch (key) {
    case "nightlife":
      return "#D946EF";
    case "campus":
      return "#3B82F6";
    case "food":
      return "#F59E0B";
    case "events":
      return "#06B6D4";
    case "all":
    default:
      return "#3B66FF";
  }
}

export function venueAccentRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/i.test(h)) {
    return `rgba(59, 102, 255, ${alpha})`;
  }
  const n = Number.parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Mirrors web `filteredVenues` in `map/page.tsx`. */
export function venueMatchesMapFilter(
  category: string | null | undefined,
  name: string | null | undefined,
  filterKey: VenueCategoryAccentKey
): boolean {
  if (filterKey === "all") return true;
  const source = `${category ?? ""}`.toLowerCase();
  const venueName = `${name ?? ""}`.toLowerCase();

  if (filterKey === "nightlife") {
    if (CAMPUS_VENUE_NAME_SUBSTRINGS.some((fragment) => venueName.includes(fragment))) return false;
  }

  const filter = MAP_CATEGORY_FILTERS.find((f) => f.key === filterKey);
  if (!filter) return true;
  if (filter.matchers.some((token) => source.includes(token))) return true;
  if (filterKey === "campus") {
    return CAMPUS_VENUE_NAME_SUBSTRINGS.some((fragment) => venueName.includes(fragment));
  }
  return false;
}

export const MAP_CATEGORY_FILTERS = [
  { key: "all" as const, label: "All", accent: "#3B66FF", matchers: [] as string[] },
  {
    key: "nightlife" as const,
    label: "Nightlife",
    accent: "#D946EF",
    matchers: ["nightlife", "bar", "club", "party"],
  },
  {
    key: "campus" as const,
    label: "Campus",
    accent: "#3B82F6",
    matchers: ["campus", "school", "university"],
  },
  { key: "food" as const, label: "Food", accent: "#F59E0B", matchers: ["food", "restaurant", "eat", "cafe"] },
  { key: "events" as const, label: "Events", accent: "#06B6D4", matchers: ["event", "music", "show", "concert"] },
];
