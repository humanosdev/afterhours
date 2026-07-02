import { isPresenceLive, isValidCoordinatePair } from "@intencity/shared";
import { getCountsForVenue, friendQualifiesInsideAtVenue } from "./venuePresenceStats";
import { distanceMeters } from "./venuePresenceStats";
import { supabase } from "./supabase/client";
import type { UserPresenceRow } from "../types/presence";
import type { VenuePublic } from "../types/venue";

export type LivePlacesVenueRow = VenuePublic & {
  inside: number;
  nearby: number;
  total: number;
  friendsInside: number;
  friendsNearby: number;
  friendsTotal: number;
  vibe: string;
};

/** PWA live-places vibe ladder from `total` headcount. */
export function livePlacesVibe(total: number): string {
  if (total >= 16) return "Packed";
  if (total >= 8) return "Active";
  if (total >= 2) return "Warming up";
  return "Quiet";
}

export function buildLivePlacesVenueRows(
  venues: VenuePublic[],
  presence: UserPresenceRow[],
  friendIds: Set<string>,
  meId: string | null,
  ghostByUserId: Record<string, boolean>,
  nowMs = Date.now()
): LivePlacesVenueRow[] {
  const rows: LivePlacesVenueRow[] = venues.map((v) => {
    const counts = getCountsForVenue(v.id, presence, friendIds, venues, meId, ghostByUserId, nowMs);
    const total = counts.insideTotal + counts.nearbyTotal;
    return {
      ...v,
      inside: counts.insideTotal,
      nearby: counts.nearbyTotal,
      total,
      friendsInside: counts.insideFriends,
      friendsNearby: counts.nearbyFriends,
      friendsTotal: counts.insideFriends + counts.nearbyFriends,
      vibe: livePlacesVibe(total),
    };
  });

  return rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.friendsTotal !== a.friendsTotal) return b.friendsTotal - a.friendsTotal;
    return a.name.localeCompare(b.name);
  });
}

/** Friends checked in at a pin — online now + GPS inner zone + dwell (matches map sheet). */
export function livePlacesFriendPreviewIds(
  venueId: string,
  presence: UserPresenceRow[],
  friendIds: Set<string>,
  ghostByUserId: Record<string, boolean>,
  venues: VenuePublic[],
  nowMs = Date.now()
): string[] {
  const venue = venues.find((v) => v.id === venueId);
  if (!venue) return [];

  const ids = presence
    .filter(
      (p) =>
        friendIds.has(p.user_id) &&
        !ghostByUserId[p.user_id] &&
        friendQualifiesInsideAtVenue(p, venue, nowMs)
    )
    .map((p) => p.user_id);
  return Array.from(new Set(ids)).slice(0, 5);
}

export function findMyLivePresence(
  presence: UserPresenceRow[],
  meId: string | null,
  nowMs = Date.now()
): UserPresenceRow | null {
  if (!meId) return null;
  return (
    presence.find(
      (p) =>
        p.user_id === meId &&
        isValidCoordinatePair(p.lat, p.lng) &&
        isPresenceLive(p.updated_at, nowMs)
    ) ?? null
  );
}

export function distanceMilesToVenue(
  you: { lat: number; lng: number } | null,
  venue: VenuePublic
): number | null {
  if (!you || venue.lat == null || venue.lng == null) return null;
  return distanceMeters(you.lat, you.lng, venue.lat, venue.lng) / 1609.344;
}

/** Venues with at least one story row (PWA `storyVenueIds`). */
export async function fetchVenueIdsWithStories(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("stories")
    .select("venue_id")
    .not("venue_id", "is", null)
    .limit(500);

  if (error) return new Set();
  const ids = new Set<string>();
  for (const row of data ?? []) {
    const id = (row as { venue_id?: string | null }).venue_id;
    if (id) ids.add(id);
  }
  return ids;
}
