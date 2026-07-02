import type { StoryRingVisualState } from "../theme/paritySemantics";

/**
 * Three-state ring semantics (device-verified product truth):
 * - `none` — no active story → plain avatar, no ring
 * - `seen` — active story, all viewed → muted ring
 * - `unseen` — active story, not all viewed → glow ring
 */
type StoryRingStateOptions = {
  /** When false, show muted ring (not glowing unseen) until `story_views` is loaded. */
  viewedReady?: boolean;
};

export function profileStoryRingState(
  activeStories: ReadonlyArray<{ id: string }>,
  viewedIds: ReadonlySet<string>,
  options?: StoryRingStateOptions
): StoryRingVisualState {
  if (activeStories.length === 0) return "none";
  if (options?.viewedReady === false) return "seen";
  return activeStories.some((s) => !viewedIds.has(s.id)) ? "unseen" : "seen";
}

export function hubOwnStoryRingState(
  activeStories: ReadonlyArray<{ id: string }>,
  viewedIds: ReadonlySet<string>,
  options?: StoryRingStateOptions
): StoryRingVisualState {
  return profileStoryRingState(activeStories, viewedIds, options);
}

export function hubFriendStoryRingState(
  activeStories: ReadonlyArray<{ id: string }>,
  viewedIds: ReadonlySet<string>,
  options?: StoryRingStateOptions
): StoryRingVisualState {
  if (activeStories.length === 0) return "none";
  return profileStoryRingState(activeStories, viewedIds, options);
}

export { firstUnseenStoryIndex } from "./storyViewerNavigation";
