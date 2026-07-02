import { useEffect } from "react";
import { MAP_PRESENCE_REFRESH_BOOST } from "../lib/mapPresenceRefresh";
import { usePresence } from "../providers/PresenceProvider";
import { useAppLifecycle } from "../providers/AppLifecycleProvider";

/**
 * Phase 3 — when the map tab is focused, boost global presence poll (3s) and UI clock (10s).
 * Boost disabled while app is backgrounded.
 */
export function useMapPresenceRefresh(enabled: boolean): void {
  const { isAppForeground } = useAppLifecycle();
  const { setPresenceRefreshBoost, reloadPresence } = usePresence();
  const active = enabled && isAppForeground;

  useEffect(() => {
    if (!active) {
      setPresenceRefreshBoost(null);
      return;
    }

    setPresenceRefreshBoost(MAP_PRESENCE_REFRESH_BOOST);
    void reloadPresence({ quiet: true });

    return () => {
      setPresenceRefreshBoost(null);
    };
  }, [active, reloadPresence, setPresenceRefreshBoost]);
}
