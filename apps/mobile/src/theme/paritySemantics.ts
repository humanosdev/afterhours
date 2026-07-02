/**
 * Visual semantics reserved for future logic phases — native must not fake these states.
 * Wire UI via `StoryRing`, map overlays, and badges using explicit placeholders until reads ship.
 */

/** Hub / profile story ring — maps from `story_views` + story ownership (READ-SOCIAL). */
export type StoryRingVisualState = "unseen" | "seen" | "none" | "add-own";

/** Map venue energy — maps from `user_presence` aggregation (P2O-C+). */
export type VenueHeatVisualState = "quiet" | "warming" | "buzzing" | "packed" | "unknown";

/** Active friends rail — maps from `user_presence` (P2O-C). */
export type FriendPresenceVisualState = "live" | "offline" | "unknown";

/** Map filter chip — maps from venue filter logic (post P2O-C reads). */
export type MapFilterVisualState = "all" | "open" | "quiet" | "buzzing";

/** Chat list row — maps from `notifications` / unread counts (REALTIME-1). */
export type ChatUnreadVisualState = "unread" | "read" | "unknown";

/** Profile tab grids — maps from `stories` grid queries. */
export type ProfileGridVisualState = "populated" | "empty" | "loading";

/**
 * Default until `story_views` read slice: **no ring** (not muted), never fake unseen.
 */
export function defaultFriendStoryRingState(): StoryRingVisualState {
  return "none";
}

/**
 * @deprecated Hub own ring uses `hubOwnStoryRingState` + `story_views`.
 * `add-own` is only for `StoryRing` `variant="add"` composer affordance.
 */
export function defaultOwnStoryRingState(): StoryRingVisualState {
  return "add-own";
}

/** Venue cards / sheet density — no presence reads yet. */
export function defaultVenueHeatState(): VenueHeatVisualState {
  return "unknown";
}
