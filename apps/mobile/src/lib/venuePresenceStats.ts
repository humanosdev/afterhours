import {
  defaultVenueRadii,
  friendQualifiesInsideAtVenueSocial,
  friendQualifiesNearbyAtVenueSocial,
  getFriendPresenceCopyFromRow,
  getPresenceFreshness,
  isFriendOnlineNow,
  isPresenceLive,
  isPresenceLiveForHeat,
  isValidCoordinatePair,
} from "@intencity/shared";
import { resolvePresenceVenue } from "./mapPresenceMarkers";
import type { UserPresenceRow } from "../types/presence";
import type { VenuePublic } from "../types/venue";

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function venueRadii(venue: VenuePublic): { inner: number; outer: number } | null {
  if (venue.lat == null || venue.lng == null) return null;
  return defaultVenueRadii(venue);
}

export function friendQualifiesInsideAtVenue(
  row: UserPresenceRow,
  venue: VenuePublic,
  nowMs = Date.now()
): boolean {
  const radii = venueRadii(venue);
  if (!radii || venue.lat == null || venue.lng == null) return false;
  return friendQualifiesInsideAtVenueSocial(row, venue.lat, venue.lng, radii, nowMs);
}

/** Profile + hub — canonical shared copy ladder. */
export function getFriendVenueSocialHeadline(
  row: UserPresenceRow | null | undefined,
  venues: VenuePublic[],
  nowMs = Date.now()
): { headline: string; live: boolean } {
  const fallbackVenue = row ? resolvePresenceVenue(row, venues) : null;
  const { copy, liveAtVenue } = getFriendPresenceCopyFromRow(
    row,
    venues,
    "profile",
    { fallbackVenueName: fallbackVenue?.name ?? null },
    nowMs
  );
  return { headline: copy, live: liveAtVenue };
}

/** Hub active-friends rail subtitle — generic venue labels from GPS. */
export function getFriendHubActivitySubtitle(
  row: UserPresenceRow,
  venues: VenuePublic[],
  nowMs = Date.now()
): string {
  return getFriendPresenceCopyFromRow(row, venues, "hub", undefined, nowMs).copy;
}

/** Self never counts toward venue heat (PWA parity). Friend ghosts still count anonymously. */
function countsAsVenueFriend(userId: string, friendIds: Set<string>, ghostByUserId: Record<string, boolean>): boolean {
  return friendIds.has(userId) && !ghostByUserId[userId];
}

/** PWA `getCountsForVenue` — inside (red) + nearby (green) for activity sort & sheet. */
export function getCountsForVenue(
  venueId: string,
  presence: UserPresenceRow[],
  friendIds: Set<string>,
  venues: VenuePublic[],
  meId: string | null,
  ghostByUserId: Record<string, boolean>,
  nowMs = Date.now(),
  blockedUserIds: Set<string> = new Set(),
  myGhostMode = false
): { insideTotal: number; nearbyTotal: number; insideFriends: number; nearbyFriends: number } {
  const venue = venues.find((v) => v.id === venueId);
  const radii = venue ? venueRadii(venue) : null;
  if (!venue || !radii) {
    return { insideTotal: 0, nearbyTotal: 0, insideFriends: 0, nearbyFriends: 0 };
  }

  let insideTotal = 0;
  let nearbyTotal = 0;
  let insideFriends = 0;
  let nearbyFriends = 0;

  for (const p of presence) {
    const isMe = meId != null && p.user_id === meId;
    if (isMe) continue;
    if (blockedUserIds.has(p.user_id)) continue;
    if (!isValidCoordinatePair(p.lat, p.lng)) continue;
    if (!isPresenceLiveForHeat(p.updated_at, nowMs)) continue;

    const isFriend = friendIds.has(p.user_id);
    const asFriend = isMe ? false : countsAsVenueFriend(p.user_id, friendIds, ghostByUserId);
    const d = distanceMeters(p.lat, p.lng, venue.lat as number, venue.lng as number);
    const nearVenue = d <= radii.outer;
    if (!isFriend && !nearVenue) continue;

    if (d <= radii.inner) {
      insideTotal++;
      if (asFriend && friendQualifiesInsideAtVenue(p, venue, nowMs)) {
        insideFriends++;
      }
    } else if (d <= radii.outer) {
      nearbyTotal++;
      if (
        asFriend &&
        friendQualifiesNearbyAtVenueSocial(p, venue.lat as number, venue.lng as number, radii, nowMs)
      ) {
        nearbyFriends++;
      }
    }
  }

  return { insideTotal, nearbyTotal, insideFriends, nearbyFriends };
}

export type VenuePresenceSheetStats = {
  insideTotal: number;
  nearbyTotal: number;
  insideFriends: number;
  nearbyFriends: number;
};

export type VenueSheetPerson = {
  userId: string;
  label: string;
  avatarUrl: string | null;
  isRecentPresence: boolean;
};

export type VenueSheetPeople = {
  insideFriends: VenueSheetPerson[];
  nearbyFriends: VenueSheetPerson[];
  insideAllCount: number;
  nearbyAllCount: number;
};

type FriendLookup = { id: string; label: string; avatar_url: string | null };

/** PWA `getVenuePeople` — inside/nearby friend chips for venue sheet. */
export function getVenueSheetPeople(
  venue: VenuePublic,
  presence: UserPresenceRow[],
  friends: FriendLookup[],
  meId: string | null,
  ghostByUserId: Record<string, boolean>,
  nowMs = Date.now(),
  blockedUserIds: Set<string> = new Set(),
  myGhostMode = false
): VenueSheetPeople {
  const radii = venueRadii(venue);
  if (!radii || venue.lat == null || venue.lng == null) {
    return { insideFriends: [], nearbyFriends: [], insideAllCount: 0, nearbyAllCount: 0 };
  }

  const friendById = new Map(friends.map((f) => [f.id, f]));
  const friendIdSet = new Set(friends.map((f) => f.id));
  const insideFriends: VenueSheetPerson[] = [];
  const nearbyFriends: VenueSheetPerson[] = [];
  let insideAllCount = 0;
  let nearbyAllCount = 0;

  for (const p of presence) {
    const isMe = meId != null && p.user_id === meId;
    if (isMe) continue;
    if (blockedUserIds.has(p.user_id)) continue;
    if (!isValidCoordinatePair(p.lat, p.lng)) continue;
    const freshness = getPresenceFreshness(p.updated_at, nowMs);
    if (freshness === "stale") continue;

    const d = distanceMeters(p.lat, p.lng, venue.lat, venue.lng);
    const isFriend = friendById.has(p.user_id);
    const asFriend = isMe ? false : countsAsVenueFriend(p.user_id, friendIdSet, ghostByUserId);
    if (!isFriend && !isMe && d > radii.outer) continue;

    const profile = friendById.get(p.user_id);
    const online = isFriendOnlineNow(p.updated_at, nowMs);
    const isRecentPresence =
      asFriend && !online && (freshness === "live" || freshness === "recent");

    if (d <= radii.inner) {
      insideAllCount++;
      if (asFriend && profile && friendQualifiesInsideAtVenue(p, venue, nowMs)) {
        insideFriends.push({
          userId: p.user_id,
          label: profile.label,
          avatarUrl: profile.avatar_url,
          isRecentPresence,
        });
      }
    } else if (d <= radii.outer) {
      nearbyAllCount++;
      if (
        asFriend &&
        profile &&
        friendQualifiesNearbyAtVenueSocial(p, venue.lat, venue.lng, radii, nowMs)
      ) {
        nearbyFriends.push({
          userId: p.user_id,
          label: profile.label,
          avatarUrl: profile.avatar_url,
          isRecentPresence,
        });
      }
    }
  }

  return { insideFriends, nearbyFriends, insideAllCount, nearbyAllCount };
}

export function getVenueSheetPresenceStats(
  venue: VenuePublic,
  presence: UserPresenceRow[],
  friendIds: Set<string>,
  meId: string | null,
  ghostByUserId: Record<string, boolean>,
  nowMs = Date.now(),
  blockedUserIds: Set<string> = new Set(),
  myGhostMode = false
): VenuePresenceSheetStats {
  const counts = getCountsForVenue(
    venue.id,
    presence,
    friendIds,
    [venue],
    meId,
    ghostByUserId,
    nowMs,
    blockedUserIds,
    myGhostMode
  );
  return {
    insideTotal: counts.insideTotal,
    nearbyTotal: counts.nearbyTotal,
    insideFriends: counts.insideFriends,
    nearbyFriends: counts.nearbyFriends,
  };
}

export type MapCheckpoint = {
  venue: VenuePublic;
  activity: number;
  distanceFromYou: number;
};

/** PWA checkpoint list — activity desc, then distance from you. */
export function buildMapCheckpoints(
  venues: VenuePublic[],
  presence: UserPresenceRow[],
  friendIds: Set<string>,
  meId: string | null,
  ghostByUserId: Record<string, boolean>,
  you: { lat: number; lng: number } | null,
  blockedUserIds: Set<string> = new Set(),
  nowMs = Date.now(),
  myGhostMode = false
): MapCheckpoint[] {
  return venues
    .map((v) => {
      const { insideTotal, nearbyTotal } = getCountsForVenue(
        v.id,
        presence,
        friendIds,
        venues,
        meId,
        ghostByUserId,
        nowMs,
        blockedUserIds,
        myGhostMode
      );
      const activity = insideTotal + nearbyTotal;
      let distanceFromYou = Number.MAX_SAFE_INTEGER;
      if (you && v.lat != null && v.lng != null && isValidCoordinatePair(v.lat, v.lng)) {
        distanceFromYou = distanceMeters(you.lat, you.lng, v.lat, v.lng);
      }
      return { venue: v, activity, distanceFromYou };
    })
    .sort((a, b) => {
      if (b.activity !== a.activity) return b.activity - a.activity;
      return a.distanceFromYou - b.distanceFromYou;
    });
}
