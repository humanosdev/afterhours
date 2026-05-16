import { useEffect, useState } from "react";
import { fetchVenuesPreview } from "../lib/fetchVenuesPreview";
import type { VenuePublic } from "../types/venue";

/**
 * Read-only venue list for signed-in shell (Phase 2L). Same fetch on Hub and Map is OK for now.
 */
export function useVenuesPreview(enabled: boolean) {
  const [venues, setVenues] = useState<VenuePublic[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setVenues([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchVenuesPreview().then(({ venues: next, error: nextError }) => {
      if (cancelled) return;
      setVenues(next);
      setError(nextError);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { venues, loading, error };
}
