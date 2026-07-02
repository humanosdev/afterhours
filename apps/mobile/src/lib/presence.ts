export {
  FRIEND_ONLINE_BADGE_MS,
  HEAT_ACTIVITY_WINDOW_MS,
  LIVE_WINDOW_MS,
  MAP_ACTIVITY_WINDOW_MS,
  RECENT_WINDOW_MS,
  DEFAULT_VENUE_INNER_RADIUS_M,
  DEFAULT_VENUE_OUTER_RADIUS_M,
  defaultVenueRadii,
  getPresenceFreshness,
  isFriendOnlineNow,
  isPresenceLive,
  isPresenceLiveForHeat,
  isPresenceRecent,
  isLikelyMapFallbackPresence,
  isValidCoordinatePair,
  friendQualifiesInsideAtVenueSocial,
  friendQualifiesNearbyAtVenueSocial,
  getFriendSocialZone,
  resolveFriendPresenceVenue,
  getFriendPresenceCopy,
  getFriendPresenceCopyFromRow,
  formatProfileVenuePillLabel,
  getFriendProfileStatusLabel,
} from "@intencity/shared";

export type { PresenceFreshness, FriendPresenceCopySurface, FriendPresenceCopyResult } from "@intencity/shared";

import {
  getFriendPresenceCopy,
  type FriendPresenceCopySurface,
} from "@intencity/shared";

/** @deprecated Use getFriendPresenceCopy — timestamp + venue_id ladder for legacy callers. */
export function getFriendSocialActivitySubtitle(
  args: {
    ghostMode: boolean;
    updatedAt: string | null | undefined;
    venueId: string | null | undefined;
    venueName: string | null | undefined;
    genericVenueLabel?: boolean;
  },
  nowMs = Date.now()
): string {
  const surface: FriendPresenceCopySurface = args.genericVenueLabel ? "hub" : "map";
  return getFriendPresenceCopy(
    {
      ghostMode: args.ghostMode,
      updatedAt: args.updatedAt,
      fallbackVenueName: args.venueId ? args.venueName : null,
      surface,
    },
    nowMs
  ).copy;
}

/** @deprecated Use getFriendPresenceCopy with surface profile. */
export function getFriendProfileVenueHeadline(
  args: { updatedAt: string | null | undefined; venueName: string | null | undefined },
  nowMs = Date.now()
): string {
  return getFriendPresenceCopy(
    {
      updatedAt: args.updatedAt,
      fallbackVenueName: args.venueName,
      surface: "profile",
    },
    nowMs
  ).copy;
}
