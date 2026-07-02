import { useMemo } from "react";
import { formatProfileVenuePillLabel } from "../lib/presence";
import { presenceNowMs } from "../lib/presenceNowMs";
import { getFriendVenueSocialHeadline } from "../lib/venuePresenceStats";
import { usePresence } from "../providers/PresenceProvider";
import type { VenuePublic } from "../types/venue";

/** PWA `/u/[username]` — friends-only live venue pill from GPS + dwell (not stale `venue_id`). */
export function useFriendProfileVenuePill(args: {
  themId: string | null | undefined;
  isFriend: boolean;
  ghostMode: boolean;
  profileInactive?: boolean;
  venues: VenuePublic[];
}): { pillLabel: string; venueLive: boolean } {
  const { presence, presenceClock } = usePresence();

  return useMemo(() => {
    const notAt = { pillLabel: "Not at a venue", venueLive: false };
    if (!args.themId || args.ghostMode || !args.isFriend || args.profileInactive) {
      return notAt;
    }

    const nowMs = presenceNowMs();
    const row = presence.find((p) => p.user_id === args.themId) ?? null;
    const { headline, live } = getFriendVenueSocialHeadline(row, args.venues, nowMs);

    if (
      headline === "Active now" ||
      headline === "Offline" ||
      headline === "Not at a venue" ||
      headline === "Recently active" ||
      headline === "Away"
    ) {
      return { pillLabel: "Not at a venue", venueLive: false };
    }

    return {
      pillLabel: formatProfileVenuePillLabel(headline),
      venueLive: live,
    };
  }, [
    args.themId,
    args.isFriend,
    args.ghostMode,
    args.profileInactive,
    args.venues,
    presence,
    presenceClock,
  ]);
}
