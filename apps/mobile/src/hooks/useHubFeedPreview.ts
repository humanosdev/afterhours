import { useEffect, useMemo, useState } from "react";
import { fetchHubFeedPreview } from "../lib/fetchHubFeedPreview";
import type { AcceptedFriendPublic } from "../types/friend";
import type { HubShareFeedItem } from "../types/hubFeed";

/**
 * Read-only Hub “Shares” rail (Phase 2M). Waits for accepted-friends list like web hub deps.
 */
export function useHubFeedPreview(userId: string | undefined, friends: AcceptedFriendPublic[], friendsLoading: boolean) {
  const [shares, setShares] = useState<HubShareFeedItem[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const friendKey = useMemo(
    () =>
      friends
        .map((f) => f.id)
        .sort()
        .join(","),
    [friends]
  );

  useEffect(() => {
    if (!userId) {
      setShares([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (friendsLoading) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const friendIds = friends.map((f) => f.id);
    fetchHubFeedPreview(userId, friendIds).then(({ shares: next, error: nextError }) => {
      if (cancelled) return;
      setShares(next);
      setError(nextError);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, friendKey, friendsLoading]);

  return { shares, loading, error };
}
