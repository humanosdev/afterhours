import { formatProfileVenuePillLabel, getFriendPresenceCopy } from "./presence";
import type { LocalPresencePreview } from "./localPresencePreview";
import { resolvePresenceVenue } from "./mapPresenceMarkers";
import type { UserPresenceRow } from "../types/presence";
import type { VenuePublic } from "../types/venue";

export type MyVenuePresence = {
  venue: VenuePublic | null;
  headline: string;
  pillLabel: string;
  /** Live inside the pin (`At {venue}`). */
  isLiveHere: boolean;
  /** Inner dwell pending (`inner_pending`). */
  isSettlingHere: boolean;
  /** Any resolved venue with recent presence copy. */
  isAtVenue: boolean;
  ghostMode: boolean;
};

const EMPTY: MyVenuePresence = {
  venue: null,
  headline: "Not at a venue",
  pillLabel: "Not at a venue",
  isLiveHere: false,
  isSettlingHere: false,
  isAtVenue: false,
  ghostMode: false,
};

function headlineFromLocalPreview(preview: LocalPresencePreview): string {
  const name = preview.venue?.name?.trim();
  if (!name) return "Not at a venue";
  if (preview.isSettlingHere) return `Arriving · ${name}`;
  if (preview.isLiveHere) return `At ${name}`;
  if (preview.zoneType === "outer" || preview.zoneType === "halo") return `Away · At ${name}`;
  return "Not at a venue";
}

export function computeMyVenuePresence(args: {
  userId: string | null | undefined;
  ghostMode: boolean;
  presence: UserPresenceRow[];
  venues: VenuePublic[];
  nowMs?: number;
  /** EVOLVE-3 — local FSM preview from device GPS (preferred over DB for self). */
  localPreview?: LocalPresencePreview | null;
}): MyVenuePresence {
  if (!args.userId) return EMPTY;

  const nowMs = args.nowMs ?? Date.now();
  const row = args.presence.find((p) => p.user_id === args.userId);

  if (args.ghostMode) {
    const venue = args.localPreview?.venue ?? (row ? resolvePresenceVenue(row, args.venues) : null);
    return {
      venue,
      headline: "Ghost mode on",
      pillLabel: "Ghost mode on",
      isLiveHere: false,
      isSettlingHere: false,
      isAtVenue: Boolean(venue),
      ghostMode: true,
    };
  }

  if (args.localPreview?.isAtVenue && args.localPreview.venue) {
    const dbVenue = row ? resolvePresenceVenue(row, args.venues) : null;
    const sameVenueAsLocal =
      dbVenue?.id === args.localPreview.venue.id ||
      row?.venue_id === args.localPreview.venue.id;
    const dbConfirmedSameVenue =
      row?.venue_state === "inner_confirmed" && sameVenueAsLocal;

    if (dbConfirmedSameVenue) {
      const name = args.localPreview.venue.name?.trim() || dbVenue?.name?.trim();
      const headline = name ? `At ${name}` : "Not at a venue";
      return {
        venue: args.localPreview.venue,
        headline,
        pillLabel: formatProfileVenuePillLabel(headline),
        isLiveHere: true,
        isSettlingHere: false,
        isAtVenue: true,
        ghostMode: false,
      };
    }

    const headline = headlineFromLocalPreview(args.localPreview);
    return {
      venue: args.localPreview.venue,
      headline,
      pillLabel: formatProfileVenuePillLabel(headline),
      isLiveHere: args.localPreview.isLiveHere,
      isSettlingHere: args.localPreview.isSettlingHere,
      isAtVenue: true,
      ghostMode: false,
    };
  }

  const venue = row ? resolvePresenceVenue(row, args.venues) : null;
  const venueName = venue?.name?.trim() ?? null;
  const headlineFromVenue = getFriendPresenceCopy(
    {
      updatedAt: row?.updated_at,
      lat: row?.lat,
      lng: row?.lng,
      venueState: row?.venue_state,
      enteredInnerAt: row?.entered_inner_at,
      venues: args.venues,
      fallbackVenueName: venueName,
      surface: "profile",
    },
    nowMs
  ).copy;
  const isLiveHere = headlineFromVenue.startsWith("At ");
  const isAtVenue = Boolean(venue) && headlineFromVenue !== "Not at a venue";

  const pillLabel = formatProfileVenuePillLabel(headlineFromVenue);
  return {
    venue,
    headline: headlineFromVenue,
    pillLabel,
    isLiveHere,
    isSettlingHere: false,
    isAtVenue,
    ghostMode: false,
  };
}
