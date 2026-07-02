import { useEffect, useRef } from "react";
import { computePresenceFromGps } from "@intencity/shared";
import { maybeEarnProfileVenue } from "../lib/maybeEarnProfileVenue";
import { venuesForPresenceSync } from "../lib/venuesForPresenceSync";
import type { VenuePublic } from "../types/venue";
import type { DeviceCoords } from "../lib/nativeForegroundLocation";

const EARN_ATTEMPT_MIN_MS = 30_000;

/**
 * Native profile-place earn — local GPS FSM only (no `user_presence` writes until P2O-D).
 * Calls `maybe_earn_profile_venue` after 15+ continuous minutes in a venue inner zone.
 */
export function useProfilePlaceEarn(args: {
  enabled: boolean;
  userId: string | undefined;
  ghostMode: boolean;
  coords: DeviceCoords | null;
  venues: VenuePublic[];
}) {
  const { enabled, userId, ghostMode, coords, venues } = args;
  const venueStateRef = useRef("outside");
  const enteredInnerAtRef = useRef<string | null>(null);
  const lastEarnAttemptRef = useRef(0);

  useEffect(() => {
    if (!enabled || !userId || ghostMode) {
      venueStateRef.current = "outside";
      enteredInnerAtRef.current = null;
      return;
    }
    if (!coords || venues.length === 0) return;

    const syncVenues = venuesForPresenceSync(venues);
    if (!syncVenues.length) return;

    const computed = computePresenceFromGps({
      lat: coords.lat,
      lng: coords.lng,
      venues: syncVenues,
      prevVenueState: venueStateRef.current,
      prevEnteredInnerAt: enteredInnerAtRef.current,
      nowMs: coords.recordedAtMs,
    });

    venueStateRef.current = computed.venueState;
    enteredInnerAtRef.current = computed.enteredInnerAt;

    const now = Date.now();
    if (now - lastEarnAttemptRef.current < EARN_ATTEMPT_MIN_MS) return;
    lastEarnAttemptRef.current = now;

    void maybeEarnProfileVenue({
      userId,
      venueId: computed.venueId,
      zoneType: computed.zoneType,
      enteredInnerAt: computed.enteredInnerAt,
    });
  }, [enabled, userId, ghostMode, coords, venues]);
}
