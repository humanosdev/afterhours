import { useEffect, useState } from "react";
import { fetchMyProfile } from "../lib/fetchMyProfile";
import type { MyProfile } from "../types/profile";

export function useMyProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchMyProfile(userId).then(({ profile: nextProfile, error: nextError }) => {
      if (cancelled) return;
      setProfile(nextProfile);
      setError(nextError);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { profile, loading, error };
}
