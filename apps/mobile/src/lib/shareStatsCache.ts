import type { HubShareFeedCardState } from "./storyFeedInteractions";
import { patchHubShareLikeOptimistic } from "./storyFeedInteractions";

export const EMPTY_SHARE_STATS: HubShareFeedCardState = {
  likesCount: 0,
  commentsCount: 0,
  liked: false,
  likedByLine: null,
  commentPreviews: [],
};

const cache = new Map<string, HubShareFeedCardState>();

export function getCachedShareStats(storyId: string): HubShareFeedCardState | null {
  return cache.get(storyId) ?? null;
}

export function pickCachedShareStats(storyIds: string[]): Record<string, HubShareFeedCardState> {
  const out: Record<string, HubShareFeedCardState> = {};
  for (const id of storyIds) {
    const row = cache.get(id);
    if (row) out[id] = row;
  }
  return out;
}

export function mergeShareStatsCache(patch: Record<string, HubShareFeedCardState>): void {
  for (const [id, row] of Object.entries(patch)) {
    cache.set(id, row);
  }
}

export function patchShareStatsCache(
  storyId: string,
  updater: (prev: HubShareFeedCardState) => HubShareFeedCardState
): HubShareFeedCardState {
  const prev = cache.get(storyId) ?? EMPTY_SHARE_STATS;
  const next = updater(prev);
  cache.set(storyId, next);
  return next;
}

export function patchShareStatsCommentsDelta(storyId: string, delta: number): void {
  if (!delta) return;
  patchShareStatsCache(storyId, (prev) => ({
    ...prev,
    commentsCount: Math.max(0, prev.commentsCount + delta),
  }));
}

export function patchShareStatsLike(storyId: string, liked: boolean): HubShareFeedCardState {
  return patchShareStatsCache(storyId, (prev) => patchHubShareLikeOptimistic(prev, liked));
}

/** Live row from parent state, else session cache, else empty — avoids 0-like flash on revisit. */
export function resolveShareStats(
  storyId: string,
  live?: HubShareFeedCardState | null
): HubShareFeedCardState {
  if (live) return live;
  return getCachedShareStats(storyId) ?? EMPTY_SHARE_STATS;
}
