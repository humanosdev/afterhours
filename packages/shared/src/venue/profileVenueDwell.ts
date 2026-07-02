import { PROFILE_VENUE_DWELL_MS } from "../presence/constants";

/** True when the user has been continuously inside a venue inner zone long enough to earn a profile venue. */
export function hasProfileVenueDwell(args: {
  zoneType: string | null | undefined;
  venueId: string | null | undefined;
  enteredInnerAt: string | null | undefined;
  nowMs?: number;
}): boolean {
  if (args.zoneType !== "inner") return false;
  if (!args.venueId?.trim()) return false;
  if (!args.enteredInnerAt) return false;
  const enteredMs = new Date(args.enteredInnerAt).getTime();
  if (!Number.isFinite(enteredMs)) return false;
  const nowMs = args.nowMs ?? Date.now();
  return nowMs - enteredMs >= PROFILE_VENUE_DWELL_MS;
}

/** @deprecated Use hasProfileVenueDwell */
export const hasProfilePlaceDwell = hasProfileVenueDwell;
