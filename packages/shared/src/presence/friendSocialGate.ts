import { distanceMeters } from "../geo/distanceMeters";
import {
  hasInnerClusterDwell,
  resolvePresenceVenueZone,
  type PresenceVenueZone,
  type VenueZoneRadii,
} from "../venue/mapVenueCluster";
import { isValidCoordinatePair } from "./coordinates";
import { isFriendOnlineNow } from "./freshness";
import { defaultVenueRadii } from "./venueRadii";

export type FriendPresenceCoordRow = {
  lat: number;
  lng: number;
  updated_at: string | null | undefined;
  venue_state?: string | null;
  entered_inner_at?: string | null;
};

export type VenueForFriendSocial = VenueZoneRadii & { name: string };

export type FriendSocialZone = "inside" | "nearby" | "online_only" | "offline";

export function friendPresenceVenueZone(
  row: FriendPresenceCoordRow,
  venueLat: number,
  venueLng: number,
  radii: { inner: number; outer: number }
): PresenceVenueZone | null {
  const d = distanceMeters(row.lat, row.lng, venueLat, venueLng);
  if (d <= radii.inner) return "inner";
  if (d <= radii.outer) return "outer";
  return null;
}

/** Online now + GPS inner + inner dwell confirmed. */
export function friendQualifiesInsideAtVenueSocial(
  row: FriendPresenceCoordRow,
  venueLat: number,
  venueLng: number,
  radii: { inner: number; outer: number },
  nowMs = Date.now()
): boolean {
  const zone = friendPresenceVenueZone(row, venueLat, venueLng, radii);
  if (zone !== "inner") return false;
  if (!isFriendOnlineNow(row.updated_at, nowMs)) return false;
  return hasInnerClusterDwell({
    zone,
    venueState: row.venue_state,
    enteredInnerAt: row.entered_inner_at,
    nowMs,
  });
}

/** Online now + GPS outer ring. */
export function friendQualifiesNearbyAtVenueSocial(
  row: FriendPresenceCoordRow,
  venueLat: number,
  venueLng: number,
  radii: { inner: number; outer: number },
  nowMs = Date.now()
): boolean {
  const zone = friendPresenceVenueZone(row, venueLat, venueLng, radii);
  if (zone !== "outer") return false;
  return isFriendOnlineNow(row.updated_at, nowMs);
}

export function getFriendSocialZone(
  row: FriendPresenceCoordRow,
  venue: { lat: number; lng: number; inner_radius_m: number; outer_radius_m: number } | null,
  nowMs = Date.now()
): FriendSocialZone {
  if (!isFriendOnlineNow(row.updated_at, nowMs)) return "offline";
  if (!venue || !isValidCoordinatePair(row.lat, row.lng)) return "online_only";
  const radii = { inner: venue.inner_radius_m, outer: venue.outer_radius_m };
  if (friendQualifiesInsideAtVenueSocial(row, venue.lat, venue.lng, radii, nowMs)) return "inside";
  if (friendQualifiesNearbyAtVenueSocial(row, venue.lat, venue.lng, radii, nowMs)) return "nearby";
  return "online_only";
}

/** Best-match venue from GPS (inner beats outer). Excludes halo. */
export function resolveFriendPresenceVenue<
  T extends {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    inner_radius_m?: number | null;
    outer_radius_m?: number | null;
  },
>(row: FriendPresenceCoordRow, venues: T[]): (T & { inner_radius_m: number; outer_radius_m: number }) | null {
  const zoneRadii: VenueZoneRadii[] = [];
  const byId = new Map<string, T & { inner_radius_m: number; outer_radius_m: number }>();

  for (const v of venues) {
    if (v.lat == null || v.lng == null) continue;
    const radii = defaultVenueRadii(v);
    zoneRadii.push({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      inner_radius_m: radii.inner,
      outer_radius_m: radii.outer,
    });
    byId.set(v.id, { ...v, inner_radius_m: radii.inner, outer_radius_m: radii.outer });
  }

  const resolved = resolvePresenceVenueZone(row, zoneRadii);
  if (!resolved) return null;
  return byId.get(resolved.venueId) ?? null;
}
