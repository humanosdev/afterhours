import { useCallback, useMemo } from "react";
import { computeMyVenuePresence } from "../lib/myVenuePresence";
import { presenceNowMs } from "../lib/presenceNowMs";
import { useLocalPresencePreview } from "./useLocalPresencePreview";
import { useMyProfile } from "./useMyProfile";
import { usePresence } from "../providers/PresenceProvider";
import type { DeviceCoords } from "../lib/nativeForegroundLocation";
import type { VenuePublic } from "../types/venue";

export function useMyVenuePresence(
  userId: string | undefined,
  venues: VenuePublic[],
  opts?: {
    youCoords?: DeviceCoords | null;
    /** EVOLVE-3 — refresh friends’ read model on local zone entry. */
    onZoneTransition?: () => void;
  }
) {
  const { presence, presenceClock, reloadPresence } = usePresence();
  const { profile } = useMyProfile(userId);
  const ghostMode = Boolean(profile?.ghost_mode);

  const onZoneTransition = useCallback(() => {
    void reloadPresence({ quiet: true });
    opts?.onZoneTransition?.();
  }, [reloadPresence, opts?.onZoneTransition]);

  const row = userId ? presence.find((p) => p.user_id === userId) ?? null : null;

  const localPreview = useLocalPresencePreview({
    enabled: Boolean(userId) && !ghostMode && Boolean(opts?.youCoords),
    userId,
    coords: opts?.youCoords ?? null,
    venues,
    presenceRow: row,
    onZoneTransition,
  });

  return useMemo(
    () =>
      computeMyVenuePresence({
        userId,
        ghostMode,
        presence,
        venues,
        nowMs: presenceNowMs(),
        localPreview,
      }),
    [
      userId,
      ghostMode,
      presence,
      venues,
      presenceClock,
      localPreview,
    ]
  );
}
