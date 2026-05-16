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
};
