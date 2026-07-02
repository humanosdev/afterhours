import { useCallback, useEffect, useRef, useState } from "react";
import { fetchVenuesCatalog } from "../lib/fetchVenuesPreview";
import {
  getCachedVenuesPreview,
  setCachedVenuesPreview,
} from "../lib/venuesPreviewCache";
import type { VenuePublic } from "../types/venue";

/** Full venue catalog for presence FSM — preview cache is only 60 rows. */
export function usePresenceVenueCatalog(enabled: boolean) {
  const [venues, setVenues] = useState<VenuePublic[]>(() => getCachedVenuesPreview() ?? []);
  const reloadSeq = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) {
      setVenues([]);
      return;
    }
    const seq = ++reloadSeq.current;
    const { venues: next, error } = await fetchVenuesCatalog();
    if (seq !== reloadSeq.current) return;
    if (!error && next.length > 0) {
      setCachedVenuesPreview(next);
      setVenues(next);
      return;
    }
    const cached = getCachedVenuesPreview();
    if (cached?.length) setVenues(cached);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setVenues([]);
      return;
    }
    const cached = getCachedVenuesPreview();
    if (cached?.length) setVenues(cached);
    void reload();
  }, [enabled, reload]);

  return venues;
}
