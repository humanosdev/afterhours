/**
 * Curated public API — explicit re-exports from `@intencity/shared` only (no `export *`).
 * Social copy helpers remain local below.
 */

export {
  RECENT_WINDOW_MS,
  MAP_ACTIVITY_WINDOW_MS,
  HEAT_ACTIVITY_WINDOW_MS,
  LIVE_WINDOW_MS,
  FRIEND_ONLINE_BADGE_MS,
  MAP_FALLBACK_CENTER_LAT,
  MAP_FALLBACK_CENTER_LNG,
  isLikelyMapFallbackPresence,
  isValidCoordinatePair,
  getPresenceFreshness,
  isPresenceLive,
  isPresenceLiveForHeat,
  isFriendOnlineNow,
  isPresenceRecent,
} from "@intencity/shared";

export type { PresenceFreshness } from "@intencity/shared";

import {
  isFriendOnlineNow,
  isPresenceLive,
  isPresenceRecent,
} from "@intencity/shared";

/**
 * Hub / Friends list / any “@user · …” line: one ladder so **Online** (`isFriendOnlineNow`)
 * matches strips, while softer **Away** / **Recently** use map windows (20m / 60m).
 */
export function getFriendSocialActivitySubtitle(
  args: {
    ghostMode: boolean;
    updatedAt: string | null | undefined;
    venueId: string | null | undefined;
    venueName: string | null | undefined;
    /** Hub active-friends rail — generic "At a venue" without naming the spot. */
    genericVenueLabel?: boolean;
  },
  nowMs = Date.now()
): string {
  if (args.ghostMode) return "Hiding location";
  const v = args.venueName?.trim();
  const hasVenue = Boolean(args.venueId && (args.genericVenueLabel || v));
  const venueLabel = args.genericVenueLabel ? "a venue" : v;
  if (isFriendOnlineNow(args.updatedAt, nowMs)) {
    return hasVenue ? `At ${venueLabel}` : "Active now";
  }
  if (isPresenceLive(args.updatedAt, nowMs)) {
    return hasVenue ? `Away · At ${venueLabel}` : "Away";
  }
  if (isPresenceRecent(args.updatedAt, nowMs)) {
    return hasVenue ? `Recently at ${venueLabel}` : "Recently active";
  }
  return "Offline";
}

/** Friends-only venue pill on `/u/[username]` (caller handles ghost / not-friend). */
export function getFriendProfileVenueHeadline(
  args: { updatedAt: string | null | undefined; venueName: string | null | undefined },
  nowMs = Date.now()
): string {
  const v = args.venueName?.trim();
  if (!v) return "Not at a venue";
  if (isFriendOnlineNow(args.updatedAt, nowMs)) return `At ${v}`;
  if (isPresenceLive(args.updatedAt, nowMs)) return `Away · At ${v}`;
  if (isPresenceRecent(args.updatedAt, nowMs)) return `Recently at ${v}`;
  return "Not at a venue";
}

/** Profile “Status” column for someone else’s page. */
export function getFriendProfileStatusLabel(
  args: { ghostMode: boolean; isFriend: boolean; updatedAt: string | null | undefined },
  nowMs = Date.now()
): string {
  if (args.ghostMode) return "Hiding location";
  if (!args.isFriend) return "—";
  if (isFriendOnlineNow(args.updatedAt, nowMs)) return "Online";
  if (isPresenceLive(args.updatedAt, nowMs) || isPresenceRecent(args.updatedAt, nowMs)) return "Away";
  return "Offline";
}
