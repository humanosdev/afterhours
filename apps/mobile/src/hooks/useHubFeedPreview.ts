import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchHubFeedPreview } from "../lib/fetchHubFeedPreview";
import { fetchHubShareFeedCardStates } from "../lib/storyFeedInteractions";
import {
  getCachedHubFeedPreview,
  setCachedHubFeedPreview,
} from "../lib/hubFeedPreviewCache";
import type { AcceptedFriendPublic } from "../types/friend";
import type { HubShareFeedItem } from "../types/hubFeed";
import { mergeOptimisticShareRows } from "../lib/storyPostOptimistic";

/**
 * Read-only Hub “Shares” rail (Phase 2M). Waits for accepted-friends list like web hub deps.
 */
export function useHubFeedPreview(
  userId: string | undefined,
  friends: AcceptedFriendPublic[],
  _friendsLoading: boolean,
  refreshKey = 0
) {
  const friendKey = useMemo(
    () =>
      friends
        .map((f) => f.id)
        .sort()
        .join(","),
    [friends]
  );

  const [shares, setShares] = useState<HubShareFeedItem[]>(() => {
    if (!userId) return [];
    return getCachedHubFeedPreview(userId, friendKey) ?? [];
  });
  const [loading, setLoading] = useState(
    () => Boolean(userId) && getCachedHubFeedPreview(userId ?? "", friendKey) == null
  );
  const [error, setError] = useState<string | null>(null);
  const sharesCountRef = useRef(shares.length);

  const reload = useCallback(
    (opts?: { quiet?: boolean }) => {
      if (!userId) {
        setShares([]);
        setLoading(false);
        setError(null);
        sharesCountRef.current = 0;
        return;
      }

      const quiet = opts?.quiet ?? sharesCountRef.current > 0;
      if (!quiet) setLoading(true);
      setError(null);

      const friendIds = friends.map((f) => f.id);
      void fetchHubFeedPreview(userId, friendIds)
        .then(({ shares: next, error: nextError }) => {
          setCachedHubFeedPreview(userId, friendKey, next);
          sharesCountRef.current = next.length;
          setShares((prev) => mergeOptimisticShareRows(next, prev));
          setError(nextError);
          if (next.length) {
            void fetchHubShareFeedCardStates(
              next.map((s) => s.id),
              userId,
              friendIds
            );
          }
        })
        .catch(() => {
          setError("Could not load shares.");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [userId, friends, friendKey]
  );

  useEffect(() => {
    if (!userId) {
      setShares([]);
      setLoading(false);
      setError(null);
      sharesCountRef.current = 0;
      return;
    }

    const cached = getCachedHubFeedPreview(userId, friendKey);
    if (cached) {
      setShares(cached);
      sharesCountRef.current = cached.length;
      setLoading(false);
      if (cached.length) {
        void fetchHubShareFeedCardStates(
          cached.map((s) => s.id),
          userId,
          friends.map((f) => f.id)
        );
      }
    } else {
      setLoading(true);
    }
    setError(null);

    reload({ quiet: cached != null });
  }, [userId, friendKey, refreshKey, reload]);

  return { shares, loading, error, setShares, reload };
}
