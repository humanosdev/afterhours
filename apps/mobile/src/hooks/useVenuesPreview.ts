import { useCallback, useEffect, useRef, useState } from "react";
import { fetchVenuesPreview } from "../lib/fetchVenuesPreview";
import {
  getCachedVenuesPreview,
  setCachedVenuesPreview,
} from "../lib/venuesPreviewCache";
import type { VenuePublic } from "../types/venue";

/**
 * Read-only venue list for signed-in shell (Phase 2L). Same fetch on Hub and Map is OK for now.
 */
export function useVenuesPreview(enabled: boolean) {
  const [venues, setVenues] = useState<VenuePublic[]>(() => getCachedVenuesPreview() ?? []);
  const [loading, setLoading] = useState(() => enabled && getCachedVenuesPreview() == null);
  const [error, setError] = useState<string | null>(null);
  const reloadSeq = useRef(0);

  const reload = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!enabled) {
        setVenues([]);
        setLoading(false);
        setError(null);
        return;
      }
      const seq = ++reloadSeq.current;
      if (!opts?.quiet) setLoading(true);
      setError(null);
      const { venues: next, error: nextError } = await fetchVenuesPreview();
      if (seq !== reloadSeq.current) return;
      setCachedVenuesPreview(next);
      setVenues(next);
      setError(nextError);
      setLoading(false);
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      setVenues([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = getCachedVenuesPreview();
    if (cached) {
      setVenues(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    void reload({ quiet: cached != null });
  }, [enabled, reload]);

  return { venues, loading, error, reload };
}
