import { useEffect, useState } from "react";
import { fetchActiveMomentsForUser } from "../lib/fetchActiveMoments";
import { profileStoryRingState } from "../lib/storyRingState";
import { subscribeStoryViewed } from "../lib/storyViewEvents";
import { getCachedViewedStoryIds, setCachedViewedStoryIds } from "../lib/storyViewedCache";
import { fetchViewedStoryIds } from "../lib/storyViews";
import { supabase } from "../lib/supabase/client";
import type { StoryViewerStory } from "../lib/storyViewerTypes";
import type { StoryRingVisualState } from "../theme/paritySemantics";

type UseStoryRingStateOptions = {
  enabled?: boolean;
  /** Bump when moments refetch (e.g. `storyEpoch` after viewer close / post). */
  refreshKey?: number;
};

/**
 * Profile avatar ring — active moments + `story_views` for viewer.
 * PWA: `profile/page.tsx` `storyRingActive`, `u/[username]` friend branch.
 */
export function useStoryRingState(
  ownerId: string | undefined,
  viewerId: string | undefined,
  options: UseStoryRingStateOptions = {}
) {
  const { enabled = true, refreshKey = 0 } = options;
  const [stories, setStories] = useState<StoryViewerStory[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [viewedReady, setViewedReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ownerId || !enabled) {
      setStories([]);
      setViewedIds(new Set());
      setViewedReady(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setViewedReady(false);

    void fetchActiveMomentsForUser(ownerId, { viewerId }).then(async (active) => {
      if (cancelled) return;
      setStories(active);
      const storyIds = active.map((s) => s.id);
      const cached =
        viewerId && storyIds.length > 0 ? getCachedViewedStoryIds(viewerId, storyIds) : null;
      if (cached) {
        setViewedIds(cached);
        setViewedReady(true);
      }
      const viewed =
        viewerId && storyIds.length > 0
          ? await fetchViewedStoryIds(supabase, viewerId, storyIds)
          : new Set<string>();
      if (!cancelled) {
        setViewedIds(viewed);
        if (viewerId && storyIds.length > 0) setCachedViewedStoryIds(viewerId, storyIds, viewed);
        setViewedReady(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ownerId, viewerId, refreshKey, enabled]);

  useEffect(() => {
    return subscribeStoryViewed((storyId) => {
      setViewedIds((prev) => {
        if (prev.has(storyId)) return prev;
        const next = new Set(prev);
        next.add(storyId);
        return next;
      });
    });
  }, []);

  const ringState: StoryRingVisualState = profileStoryRingState(stories, viewedIds, {
    viewedReady,
  });

  return { stories, viewedIds, ringState, loading, viewedReady };
}
