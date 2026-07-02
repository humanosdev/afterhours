import {
  distanceMeters,
  hasInnerClusterDwell,
  isFriendOnlineNow,
  isValidCoordinatePair,
  resolvePresenceVenueZone,
  type PresenceVenueZone,
} from "@intencity/shared";

type PresenceLike = {
  lat: number;
  lng: number;
  updated_at: string;
  venue_state?: string | null;
  entered_inner_at?: string | null;
};

type VenueLike = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  inner_radius_m?: number;
  outer_radius_m?: number;
};

function venueRadii(venue: VenueLike): { inner: number; outer: number } {
  return {
    inner: venue.inner_radius_m ?? 80,
    outer: venue.outer_radius_m ?? 200,
  };
}

function presenceVenueZone(
  p: PresenceLike,
  venueLat: number,
  venueLng: number,
  radii: { inner: number; outer: number }
): PresenceVenueZone | null {
  const d = distanceMeters(p.lat, p.lng, venueLat, venueLng);
  if (d <= radii.inner) return "inner";
  if (d <= radii.outer) return "outer";
  return null;
}

function resolvePresenceVenue(p: PresenceLike, venues: VenueLike[]): VenueLike | null {
  const zoneRadii = venues
    .filter((v) => v.lat != null && v.lng != null)
    .map((v) => ({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      inner_radius_m: v.inner_radius_m ?? 80,
      outer_radius_m: v.outer_radius_m ?? 200,
    }));
  const resolved = resolvePresenceVenueZone(p, zoneRadii);
  if (!resolved) return null;
  return venues.find((v) => v.id === resolved.venueId) ?? null;
}

function friendCountsAsInside(
  p: PresenceLike,
  venueLat: number,
  venueLng: number,
  radii: { inner: number; outer: number },
  nowMs: number
): boolean {
  const zone = presenceVenueZone(p, venueLat, venueLng, radii);
  if (zone !== "inner") return false;
  if (!isFriendOnlineNow(p.updated_at, nowMs)) return false;
  return hasInnerClusterDwell({
    zone,
    venueState: p.venue_state,
    enteredInnerAt: p.entered_inner_at,
    nowMs,
  });
}

function friendCountsAsNearby(
  p: PresenceLike,
  venueLat: number,
  venueLng: number,
  radii: { inner: number; outer: number },
  nowMs: number
): boolean {
  const zone = presenceVenueZone(p, venueLat, venueLng, radii);
  if (zone !== "outer") return false;
  return isFriendOnlineNow(p.updated_at, nowMs);
}

/** Hub active-friends rail — GPS + dwell trust, not stale `venue_id`. */
export function getFriendHubActivitySubtitle(
  row: PresenceLike,
  venues: VenueLike[],
  nowMs = Date.now()
): string {
  if (!isValidCoordinatePair(row.lat, row.lng)) return "Offline";
  if (!isFriendOnlineNow(row.updated_at, nowMs)) return "Offline";

  const venue = resolvePresenceVenue(row, venues);
  if (!venue?.lat || !venue.lng) return "Active now";

  const radii = venueRadii(venue);
  if (friendCountsAsInside(row, venue.lat, venue.lng, radii, nowMs)) return "At a venue";
  if (friendCountsAsNearby(row, venue.lat, venue.lng, radii, nowMs)) return "Near a venue";
  return "Active now";
}
