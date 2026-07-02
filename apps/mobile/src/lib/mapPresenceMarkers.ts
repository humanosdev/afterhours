import {
  defaultVenueRadii,
  getPresenceFreshness,
  isFriendOnlineNow,
  isInVenueMapAirspace,
  isLikelyMapFallbackPresence,
  isValidCoordinatePair,
  LIVE_WINDOW_MS,
  resolvePresenceVenueZone,
  type PresenceVenueZone,
  type VenueZoneRadii,
} from "@intencity/shared";
import type { UserPresenceRow } from "../types/presence";
import type { VenuePublic } from "../types/venue";

export type MapPresenceMarkerMember = {
  userId: string;
  label: string;
  avatarUrl: string | null;
};

/** EVOLVE-1 — device GPS puck (not DB presence / interpolation). */
export type MapLocalYouMarker = MapPresenceMarkerMember & {
  lat: number;
  lng: number;
};

export type MapFriendPresenceMarker = MapPresenceMarkerMember & {
  lng: number;
  lat: number;
  isMe: boolean;
  /** Green ring + pulse when online now (`isFriendOnlineNow`, ~4 min). */
  isLive: boolean;
  isOnlineNow: boolean;
  updatedAt: string;
};

export type MapVenuePresenceCluster = {
  venueId: string;
  venue: VenuePublic;
  lng: number;
  lat: number;
  members: MapPresenceMarkerMember[];
  totalCount: number;
};

type ClusterTier = "inside" | "nearby";

type ClusterBucketEntry = {
  userId: string;
  tier: ClusterTier;
};

function venueRadii(venue: VenuePublic): { inner: number; outer: number } | null {
  if (venue.lat == null || venue.lng == null) return null;
  return defaultVenueRadii(venue);
}

function venuesToZoneRadii(venues: VenuePublic[]): VenueZoneRadii[] {
  const out: VenueZoneRadii[] = [];
  for (const v of venues) {
    if (v.lat == null || v.lng == null) continue;
    const radii = venueRadii(v);
    if (!radii) continue;
    out.push({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      inner_radius_m: radii.inner,
      outer_radius_m: radii.outer,
    });
  }
  return out;
}

/** Social / DB venue association — inner or outer (not halo). */
export function resolvePresenceVenue(p: UserPresenceRow, venues: VenuePublic[]): VenuePublic | null {
  const zoneRadii = venuesToZoneRadii(venues);
  const resolved = resolvePresenceVenueZone(p, zoneRadii);
  if (!resolved) return null;
  return venues.find((v) => v.id === resolved.venueId) ?? null;
}

/** Inner zone only — live “At venue” puck hide when truly inside. */
export function resolveVenueFromCoords(
  lat: number,
  lng: number,
  venues: VenuePublic[]
): VenuePublic | null {
  const zoneRadii = venuesToZoneRadii(venues);
  const resolved = resolvePresenceVenueZone({ lat, lng }, zoneRadii);
  if (resolved?.zone !== "inner") return null;
  return venues.find((v) => v.id === resolved.venueId) ?? null;
}

/** Outer or inner — suppress floating markers over venue airspace (stack or hidden). */
export function isCoordsInVenueMapAirspace(
  lat: number,
  lng: number,
  venues: VenuePublic[]
): boolean {
  const zoneRadii = venuesToZoneRadii(venues);
  return isInVenueMapAirspace({ lat, lng }, zoneRadii);
}

function coordinateKey(p: UserPresenceRow): string {
  return `${p.lat.toFixed(5)}:${p.lng.toFixed(5)}`;
}

/** Fan out stacked markers at identical coords (PWA `markerOffsetPosition`). */
function offsetForOverlap(
  p: UserPresenceRow,
  userId: string,
  groups: Map<string, string[]>
): [number, number] {
  const key = coordinateKey(p);
  const group = groups.get(key);
  if (!group || group.length <= 1) return [p.lng, p.lat];
  const idx = Math.max(0, group.indexOf(userId));
  const angle = (idx / group.length) * Math.PI * 2;
  const radiusMeters = Math.min(22, Math.max(7, 5 + group.length * 1.5));
  const latRad = (p.lat * Math.PI) / 180;
  const safeCos = Math.max(0.2, Math.cos(latRad));
  const dLat = (radiusMeters / 111320) * Math.sin(angle);
  const dLng = (radiusMeters / (111320 * safeCos)) * Math.cos(angle);
  return [p.lng + dLng, p.lat + dLat];
}

type FriendProfile = {
  id: string;
  label: string;
  avatar_url: string | null;
};

/** Native P2O-B: GPS is authoritative for you when DB presence is stale or missing. */
function effectivePresenceForUser(
  userId: string,
  meId: string | null,
  youCoords: { lat: number; lng: number } | null,
  known: UserPresenceRow | undefined
): UserPresenceRow | null {
  if (
    userId === meId &&
    youCoords &&
    isValidCoordinatePair(youCoords.lat, youCoords.lng) &&
    !isLikelyMapFallbackPresence(youCoords.lat, youCoords.lng)
  ) {
    return {
      user_id: userId,
      lat: youCoords.lat,
      lng: youCoords.lng,
      venue_id: null,
      zone_type: known?.zone_type ?? null,
      venue_state: known?.venue_state ?? null,
      entered_inner_at: known?.entered_inner_at ?? null,
      updated_at: new Date().toISOString(),
    };
  }
  return known ?? null;
}

function freshPresenceForVenueBucket(
  userId: string,
  meId: string | null,
  youCoords: { lat: number; lng: number } | null,
  latestFresh: UserPresenceRow | undefined,
  effective: UserPresenceRow | null
): UserPresenceRow | null {
  if (latestFresh) return latestFresh;
  if (userId === meId && effective && youCoords) return effective;
  return null;
}

function sortClusterUserIds(ids: string[], meId: string | null): string[] {
  return [...ids].sort((a, b) => {
    if (a === meId) return -1;
    if (b === meId) return 1;
    return 0;
  });
}

function pickClusterVisibleUserIds(
  entries: ClusterBucketEntry[],
  meId: string | null,
  friendIds: Set<string>,
  max = 3
): string[] {
  const insideIds = sortClusterUserIds(
    entries.filter((e) => e.tier === "inside").map((e) => e.userId),
    meId
  );
  const picked = insideIds.slice(0, max);
  if (picked.length >= max) return picked;

  const nearbyIds = sortClusterUserIds(
    entries
      .filter((e) => e.tier === "nearby" && friendIds.has(e.userId))
      .map((e) => e.userId)
      .filter((id) => !picked.includes(id)),
    meId
  );
  return [...picked, ...nearbyIds.slice(0, max - picked.length)];
}

/**
 * PWA map presence markers — friends (+ you) outside venue airspace; avatar stacks at pins.
 * Heat / sheet inside+nearby counts unchanged (`getCountsForVenue`).
 * Venue stacks mirror PWA: in-venue friends show in the cluster unless ghost mode (no dwell / online-now gate).
 */
export function computeMapPresenceMarkers(args: {
  venues: VenuePublic[];
  presence: UserPresenceRow[];
  friends: FriendProfile[];
  meId: string | null;
  myLabel: string;
  myAvatarUrl: string | null;
  myGhostMode: boolean;
  ghostByUserId: Record<string, boolean>;
  blockedUserIds?: Set<string>;
  youCoords: { lat: number; lng: number } | null;
  nowMs?: number;
}): { friendMarkers: MapFriendPresenceMarker[]; venueClusters: MapVenuePresenceCluster[] } {
  const {
    venues,
    presence,
    friends,
    meId,
    myLabel,
    myAvatarUrl,
    myGhostMode,
    ghostByUserId,
    blockedUserIds = new Set(),
    youCoords,
  } = args;

  const now = args.nowMs ?? Date.now();
  const zoneRadii = venuesToZoneRadii(venues);
  const venueById = new Map(venues.map((v) => [v.id, v]));

  if (!venues.length || !zoneRadii.length) {
    return { friendMarkers: [], venueClusters: [] };
  }

  const activeThresholdMs = LIVE_WINDOW_MS;
  const friendById = new Map(friends.map((f) => [f.id, f]));
  const friendIds = new Set(friends.map((f) => f.id));

  const latestKnownByUser = new Map<string, UserPresenceRow>();
  const latestFreshByUser = new Map<string, UserPresenceRow>();
  const activeByUser = new Map<string, UserPresenceRow>();

  for (const p of presence) {
    if (!isValidCoordinatePair(p.lat, p.lng)) continue;
    const lastMs = new Date(p.updated_at).getTime();

    const prevKnown = latestKnownByUser.get(p.user_id);
    if (!prevKnown || new Date(prevKnown.updated_at).getTime() < lastMs) {
      latestKnownByUser.set(p.user_id, p);
    }

    if (getPresenceFreshness(p.updated_at, now) === "stale") continue;
    const prevLatest = latestFreshByUser.get(p.user_id);
    if (!prevLatest || new Date(prevLatest.updated_at).getTime() < lastMs) {
      latestFreshByUser.set(p.user_id, p);
    }
    if (now - lastMs > activeThresholdMs) continue;
    const prevActive = activeByUser.get(p.user_id);
    if (!prevActive || new Date(prevActive.updated_at).getTime() < lastMs) {
      activeByUser.set(p.user_id, p);
    }
  }

  const candidateIds = Array.from(
    new Set([...(meId ? [meId] : []), ...friends.map((f) => f.id)])
  );

  const venueBuckets = new Map<
    string,
    {
      venue: VenuePublic;
      allCount: number;
      clusterEntries: ClusterBucketEntry[];
    }
  >();

  const overlapGroups = new Map<string, string[]>();

  for (const id of candidateIds) {
    if (blockedUserIds.has(id)) continue;
    const effective = effectivePresenceForUser(
      id,
      meId,
      youCoords,
      latestKnownByUser.get(id)
    );
    if (!effective || isLikelyMapFallbackPresence(effective.lat, effective.lng)) continue;
    const isMe = id === meId;
    const isFriend = friendById.has(id);
    if (!isMe && !isFriend) continue;
    const ghost = isMe ? myGhostMode : !!ghostByUserId[id];
    if (!isMe && ghost) continue;
    if (isInVenueMapAirspace(effective, zoneRadii)) continue;

    const p =
      isMe && youCoords
        ? effective
        : isMe
          ? activeByUser.get(id) ?? effective
          : activeByUser.get(id);
    if (!p) continue;

    const key = coordinateKey(p);
    const bucket = overlapGroups.get(key) ?? [];
    bucket.push(id);
    overlapGroups.set(key, bucket);
  }

  const friendMarkers: MapFriendPresenceMarker[] = [];

  for (const id of candidateIds) {
    if (blockedUserIds.has(id)) continue;
    const effective = effectivePresenceForUser(
      id,
      meId,
      youCoords,
      latestKnownByUser.get(id)
    );
    if (!effective || isLikelyMapFallbackPresence(effective.lat, effective.lng)) continue;
    const isMe = id === meId;
    const isFriend = friendById.has(id);
    if (!isMe && !isFriend) continue;

    const ghost = isMe ? myGhostMode : !!ghostByUserId[id];
    const resolved = resolvePresenceVenueZone(effective, zoneRadii);

    if (resolved) {
      const venue = venueById.get(resolved.venueId);
      if (!venue) continue;

      const fresh = freshPresenceForVenueBucket(
        id,
        meId,
        youCoords,
        latestFreshByUser.get(id),
        effective
      );
      if (!fresh) continue;

      const bucket = venueBuckets.get(resolved.venueId) ?? {
        venue,
        allCount: 0,
        clusterEntries: [],
      };
      bucket.allCount += 1;

      if (isMe || !ghost) {
        bucket.clusterEntries.push({
          userId: id,
          tier: resolved.zone === "inner" ? "inside" : "nearby",
        });
      }
      venueBuckets.set(resolved.venueId, bucket);
      continue;
    }

    const p =
      isMe && youCoords
        ? effective
        : isMe
          ? activeByUser.get(id) ?? effective
          : activeByUser.get(id);
    if (!p || (!isMe && ghost)) continue;

    /** EVOLVE-1 — device puck on map canvas; friends stay on DB/interpolated coords. */
    if (isMe && youCoords) continue;

    const profile = isMe
      ? { label: myLabel, avatar_url: myAvatarUrl }
      : friendById.get(id);
    if (!profile && !isMe) continue;

    const [lng, lat] = offsetForOverlap(p, id, overlapGroups);
    const onlineNow = isFriendOnlineNow(p.updated_at, now);

    friendMarkers.push({
      userId: id,
      lng,
      lat,
      label: profile?.label ?? (isMe ? "You" : "Friend"),
      avatarUrl: profile?.avatar_url ?? null,
      isMe,
      isLive: isMe ? true : onlineNow,
      isOnlineNow: isMe ? true : onlineNow,
      updatedAt: p.updated_at,
    });
  }

  const venueClusters: MapVenuePresenceCluster[] = [];
  for (const [venueId, bucket] of venueBuckets.entries()) {
    const visibleTop = pickClusterVisibleUserIds(bucket.clusterEntries, meId, friendIds, 3);
    if (!visibleTop.length || bucket.venue.lat == null || bucket.venue.lng == null) continue;
    const members: MapPresenceMarkerMember[] = visibleTop.map((uid) => {
      const isMe = uid === meId;
      const profile = isMe
        ? { label: myLabel, avatar_url: myAvatarUrl }
        : friendById.get(uid);
      return {
        userId: uid,
        label: profile?.label ?? (isMe ? "You" : "Friend"),
        avatarUrl: profile?.avatar_url ?? null,
      };
    });
    venueClusters.push({
      venueId,
      venue: bucket.venue,
      lng: bucket.venue.lng,
      lat: bucket.venue.lat,
      members,
      totalCount: bucket.allCount,
    });
  }

  return { friendMarkers, venueClusters };
}
