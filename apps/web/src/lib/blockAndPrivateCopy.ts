/** Shared UX copy for block + private gates (profile, blocks list, moments, etc.). */

export const BLOCK_OR_PRIVATE_COPY = {
  theyBlockedYouTitle: "This user has blocked you",
  theyBlockedYouBody:
    "You can't view their profile, posts, or messages. Only they can remove the block.",
  /** Short helper under the “Blocked you” list (blocks settings page). */
  theyBlockedYouListHint: "You can't remove their block — only they can unblock you.",
  theyBlockedYouStrip: "This user has blocked you — messaging disabled",
  youBlockedThemTitle: "You blocked this user",
  youBlockedThemBody:
    "Unblock to view their profile, send requests, and see shared content again.",
  youBlockedThemStrip: "You blocked this user",
  privateTitle: "This account is private",
  privateBody: "Add friend to view photos, moments, and shares.",
  privateStrip: "Private account",
  /** Moment / share deep link when viewer shouldn't see content */
  postUnavailableTitle: "This post isn't available",
  postUnavailableBody: "It may be private, removed, or you don't have access.",
} as const;
