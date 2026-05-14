/**
 * Venue category tint for map pins, hub live-place cards, and other venue chrome.
 * Keep classification rules aligned with map markers.
 */

export type VenueCategoryAccentKey = "all" | "nightlife" | "campus" | "food" | "events";

/** Substrings matched against `venue.category` for food-style markers. */
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

function isDiningVenueCategory(category: string | null | undefined) {
  const s = `${category ?? ""}`.toLowerCase();
  return DINING_PIN_CATEGORY_MATCHERS.some((token) => s.includes(token));
}

/** Same name hints as the Campus map filter — keep in sync when adding buildings. */
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

export function isCampusVenue(v: { category: string; name: string }) {
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

export function resolveVenueCategoryAccentKey(v: { category: string; name: string }): VenueCategoryAccentKey {
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
