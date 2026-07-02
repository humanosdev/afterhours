import { useEffect, useRef } from "react";
import { ensureSessionAppOpenRecorded } from "../lib/appOpenPreference";
import { useAuth } from "../providers/AuthProvider";

/** Counts one authenticated app open per JS session (cold start). */
export function AppOpenTracker() {
  const { user } = useAuth();
  const recordedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || recordedRef.current) return;
    recordedRef.current = true;
    void ensureSessionAppOpenRecorded(user.id);
  }, [user?.id]);

  return null;
}
