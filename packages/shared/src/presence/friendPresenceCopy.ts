import { isFriendOnlineNow, isPresenceLive, isPresenceRecent } from "./freshness";
import {
  getFriendSocialZone,
  resolveFriendPresenceVenue,
  type FriendPresenceCoordRow,
} from "./friendSocialGate";
import { isValidCoordinatePair } from "./coordinates";

export type FriendPresenceCopySurface = "hub" | "profile" | "map" | "sheet" | "livePlaces";

export type FriendPresenceCopyInput = {
  ghostMode?: boolean;
  updatedAt: string | null | undefined;
  lat?: number | null;
  lng?: number | null;
  venueState?: string | null;
  enteredInnerAt?: string | null;
  /** Venues catalog for GPS resolution (preferred over stale venue_id). */
  venues?: Array<{
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    inner_radius_m?: number | null;
    outer_radius_m?: number | null;
  }>;
  /** When GPS venue unknown — live/recent tier fallback name only. */
  fallbackVenueName?: string | null;
  surface: FriendPresenceCopySurface;
};

export type FriendPresenceCopyResult = {
  copy: string;
  /** True when online + inside social zone (confirmed dwell). */
  liveAtVenue: boolean;
};

function venueLabel(name: string | null | undefined, generic: boolean): string | null {
  const trimmed = name?.trim();
  if (generic) return "a venue";
  return trimmed || null;
}

function offlineCopy(surface: FriendPresenceCopySurface): string {
  return surface === "profile" ? "Not at a venue" : "Offline";
}

function onlineCopy(args: {
  socialZone: ReturnType<typeof getFriendSocialZone>;
  venueName: string | null | undefined;
  genericVenue: boolean;
}): string {
  const label = venueLabel(args.venueName, args.genericVenue);
  switch (args.socialZone) {
    case "inside":
      return label ? `At ${label}` : "Active now";
    case "nearby":
      return label ? `Near ${label}` : "Active now";
    case "online_only":
      return "Active now";
    default:
      return offlineCopy("hub");
  }
}

/**
 * Canonical friend presence copy ladder — Phase 0 native cutover.
 * Online tier uses GPS + social gate; live/recent use timestamp windows.
 */
export function getFriendPresenceCopy(
  input: FriendPresenceCopyInput,
  nowMs = Date.now()
): FriendPresenceCopyResult {
  if (input.ghostMode) {
    return { copy: "Hiding location", liveAtVenue: false };
  }

  const row: FriendPresenceCoordRow | null =
    input.lat != null && input.lng != null && isValidCoordinatePair(input.lat, input.lng)
      ? {
          lat: input.lat,
          lng: input.lng,
          updated_at: input.updatedAt,
          venue_state: input.venueState,
          entered_inner_at: input.enteredInnerAt,
        }
      : null;

  const resolvedVenue = row && input.venues?.length ? resolveFriendPresenceVenue(row, input.venues) : null;
  const genericVenue = input.surface === "hub";
  const fallbackName = input.fallbackVenueName?.trim() || resolvedVenue?.name?.trim() || null;

  if (isFriendOnlineNow(input.updatedAt, nowMs)) {
    const socialZone = row && resolvedVenue
      ? getFriendSocialZone(
          row,
          {
            lat: resolvedVenue.lat as number,
            lng: resolvedVenue.lng as number,
            inner_radius_m: resolvedVenue.inner_radius_m,
            outer_radius_m: resolvedVenue.outer_radius_m,
          },
          nowMs
        )
      : "online_only";

    return {
      copy: onlineCopy({ socialZone, venueName: resolvedVenue?.name ?? fallbackName, genericVenue }),
      liveAtVenue: socialZone === "inside",
    };
  }

  if (isPresenceLive(input.updatedAt, nowMs)) {
    const label = venueLabel(fallbackName, genericVenue);
    return {
      copy: label ? `Away · At ${label}` : "Away",
      liveAtVenue: false,
    };
  }

  if (isPresenceRecent(input.updatedAt, nowMs)) {
    const label = venueLabel(fallbackName, genericVenue);
    return {
      copy: label ? `Recently at ${label}` : "Recently active",
      liveAtVenue: false,
    };
  }

  return { copy: offlineCopy(input.surface), liveAtVenue: false };
}

/** Profile pill transform — "Recently at X" → "Last at X". */
export function formatProfileVenuePillLabel(venueText: string): string {
  if (venueText === "Ghost mode on") return venueText;
  if (venueText.startsWith("Arriving · ")) return venueText;
  if (venueText.startsWith("At ")) return venueText;
  if (venueText.startsWith("Near ")) return venueText;
  if (venueText.startsWith("Away · At ")) return venueText;
  if (venueText.startsWith("Recently at ")) return `Last at ${venueText.replace("Recently at ", "")}`;
  return venueText;
}

/** Profile “Status” column for someone else’s page. */
export function getFriendProfileStatusLabel(
  args: { ghostMode: boolean; isFriend: boolean; updatedAt: string | null | undefined },
  nowMs = Date.now()
): string {
  if (args.ghostMode) return "Hiding location";
  if (!args.isFriend) return "—";
  if (isFriendOnlineNow(args.updatedAt, nowMs)) return "Online";
  if (isPresenceLive(args.updatedAt, nowMs) || isPresenceRecent(args.updatedAt, nowMs)) return "Away";
  return "Offline";
}

/** Build copy from a full presence row + venues catalog. */
export function getFriendPresenceCopyFromRow<
  T extends {
    lat: number;
    lng: number;
    updated_at: string;
    venue_state?: string | null;
    entered_inner_at?: string | null;
  },
  V extends {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    inner_radius_m?: number | null;
    outer_radius_m?: number | null;
  },
>(
  row: T | null | undefined,
  venues: V[],
  surface: FriendPresenceCopySurface,
  opts?: { ghostMode?: boolean; fallbackVenueName?: string | null },
  nowMs = Date.now()
): FriendPresenceCopyResult {
  if (!row) {
    return { copy: offlineCopy(surface), liveAtVenue: false };
  }
  const resolved = resolveFriendPresenceVenue(row, venues);
  return getFriendPresenceCopy(
    {
      ghostMode: opts?.ghostMode,
      updatedAt: row.updated_at,
      lat: row.lat,
      lng: row.lng,
      venueState: row.venue_state,
      enteredInnerAt: row.entered_inner_at,
      venues,
      fallbackVenueName: opts?.fallbackVenueName ?? resolved?.name ?? null,
      surface,
    },
    nowMs
  );
}
