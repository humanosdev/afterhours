import { useCallback, useEffect, useState } from "react";
import { fetchMyProfile } from "../lib/fetchMyProfile";
import {
  clearCachedMyProfile,
  getCachedMyProfile,
  setCachedMyProfile,
} from "../lib/myProfileCache";
import { subscribeProfileUpdated } from "../lib/profileSyncEvents";
import type { MyProfile } from "../types/profile";

export function useMyProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<MyProfile | null>(() =>
    userId ? getCachedMyProfile(userId) : null
  );
  const [loading, setLoading] = useState(() => Boolean(userId) && !getCachedMyProfile(userId ?? ""));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { profile: nextProfile, error: nextError } = await fetchMyProfile(userId);
    if (nextProfile) setCachedMyProfile(userId, nextProfile, { silent: true });
    else clearCachedMyProfile(userId);
    setProfile(nextProfile);
    setError(nextError);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeProfileUpdated(() => {
      void refresh();
    });
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = getCachedMyProfile(userId);
    if (cached) {
      setProfile(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    let cancelled = false;

    fetchMyProfile(userId).then(({ profile: nextProfile, error: nextError }) => {
      if (cancelled) return;
      if (nextProfile) setCachedMyProfile(userId, nextProfile, { silent: true });
      setProfile(nextProfile);
      setError(nextError);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { profile, loading, error, refresh };
}
