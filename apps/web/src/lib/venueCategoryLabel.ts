/**
 * Human-readable venue category for UI (DB may store slugs like `bar`, `student_center`).
 */
const VENUE_CATEGORY_LABELS: Record<string, string> = {
  bar: "Bar",
  nightclub: "Nightclub",
  club: "Club",
  lounge: "Lounge",
  dining: "Dining hall",
  food: "Food",
  restaurant: "Restaurant",
  cafe: "Café",
  coffee: "Coffee",
  student_center: "Student center",
  rec: "Recreation",
  gym: "Gym",
  fitness: "Fitness",
  sports: "Sports",
  campus: "Campus",
  university: "University",
  school: "School",
  college: "College",
  dorm: "Dorm",
  library: "Library",
  event: "Events",
  events: "Events",
  music: "Music",
  concert: "Concert",
  nightlife: "Nightlife",
  pub: "Pub",
  brewery: "Brewery",
  wine: "Wine bar",
  hotel: "Hotel",
  retail: "Retail",
  other: "Venue",
};

function titleCaseSlug(raw: string): string {
  return raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatVenueCategoryLabel(category: string | null | undefined): string {
  const raw = (category ?? "").trim().toLowerCase();
  if (!raw) return "Venue";
  return VENUE_CATEGORY_LABELS[raw] ?? titleCaseSlug(raw);
}
