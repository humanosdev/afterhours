/**
 * Display-safe venue row for native (Phase 2L).
 * Coordinates are catalog data only — not tied to device GPS.
 */
export type VenuePublic = {
  id: string;
  name: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
  image_url?: string | null;
  photo_url?: string | null;
  cover_image_url?: string | null;
  /** jsonb — static copy for map sheet (`resolveVenueContextLine`). */
  context_copy?: unknown;
  inner_radius_m?: number;
  outer_radius_m?: number;
};

export function venueDisplayImageUrl(v: VenuePublic): string | null {
  const u = v.image_url || v.photo_url || v.cover_image_url;
  return typeof u === "string" && u.trim() ? u.trim() : null;
}
