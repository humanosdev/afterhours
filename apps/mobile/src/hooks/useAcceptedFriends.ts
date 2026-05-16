import { useEffect, useState } from "react";
import { fetchAcceptedFriends } from "../lib/fetchAcceptedFriends";
import type { AcceptedFriendPublic } from "../types/friend";

export function useAcceptedFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<AcceptedFriendPublic[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setFriends([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchAcceptedFriends(userId).then(({ friends: next, error: nextError }) => {
      if (cancelled) return;
      setFriends(next);
      setError(nextError);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { friends, loading, error };
}
