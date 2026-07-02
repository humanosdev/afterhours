import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeviceCoords } from "../lib/nativeForegroundLocation";
import {
  clearLocalPresenceFsm,
  hydrateLocalPresenceFsm,
  resolveBootLocalPresenceFsm,
  writeLocalPresenceFsm,
} from "../lib/localPresenceFsmStore";
import {
  EMPTY_LOCAL_FSM,
  nextLocalPresenceFsm,
  stepLocalPresencePreview,
  type LocalPresencePreview,
} from "../lib/localPresencePreview";
import type { UserPresenceRow } from "../types/presence";
import type { VenuePublic } from "../types/venue";

const SETTLING_TICK_MS = 1000;

/**
 * EVOLVE-3 — device GPS → `computePresenceFromGps` preview (no `user_presence` write).
 * Drives self “At venue” UI before web/native DB sync catches up.
 */
export function useLocalPresencePreview(args: {
  enabled: boolean;
  userId?: string | null;
  coords: DeviceCoords | null;
  venues: VenuePublic[];
  /** DB row — re-seed dwell after remount / app resume when still at the pin. */
  presenceRow?: UserPresenceRow | null;
  /** EVOLVE-3 geofence hint — fired when zone association changes (outer/inner/halo entry). */
  onZoneTransition?: (preview: LocalPresencePreview | null) => void;
}): LocalPresencePreview | null {
  const { enabled, userId, coords, venues, presenceRow, onZoneTransition } = args;
  const fsmRef = useRef(EMPTY_LOCAL_FSM);
  const zoneKeyRef = useRef("outside");
  const onZoneTransitionRef = useRef(onZoneTransition);
  onZoneTransitionRef.current = onZoneTransition;
  const [preview, setPreview] = useState<LocalPresencePreview | null>(null);
  const [fsmBootTick, setFsmBootTick] = useState(0);

  const coordsKey =
    coords == null ? null : `${coords.lat}:${coords.lng}:${coords.recordedAtMs}`;
  const venuesKey = useMemo(
    () =>
      venues
        .map((v) => v.id)
        .sort()
        .join(","),
    [venues]
  );

  const bootFsm = useMemo(
    () => resolveBootLocalPresenceFsm(userId, presenceRow),
    [userId, presenceRow?.venue_state, presenceRow?.entered_inner_at, fsmBootTick]
  );

  useEffect(() => {
    if (!userId) {
      fsmRef.current = EMPTY_LOCAL_FSM;
      return;
    }

    if (bootFsm.venueState !== "outside") {
      fsmRef.current = bootFsm;
    }

    void hydrateLocalPresenceFsm(userId).then((restored) => {
      if (restored.venueState === "outside") return;
      fsmRef.current = restored;
      setFsmBootTick((n) => n + 1);
    });
  }, [userId, bootFsm.venueState, bootFsm.enteredInnerAt]);

  const applyStep = useCallback(
    (nowMs?: number) => {
      if (!coords || venues.length === 0) return null;

      const stepped = stepLocalPresencePreview({
        coords,
        venues,
        fsm: fsmRef.current,
        nowMs,
        bootFsm,
      });

      if (stepped.preview) {
        const nextFsm = nextLocalPresenceFsm(fsmRef.current, stepped.preview);
        fsmRef.current = nextFsm;
        if (userId) {
          if (stepped.preview.venueState === "outside") {
            clearLocalPresenceFsm(userId);
          } else {
            writeLocalPresenceFsm(userId, nextFsm);
          }
        }
      } else {
        fsmRef.current = EMPTY_LOCAL_FSM;
        if (userId) clearLocalPresenceFsm(userId);
      }

      const zoneChanged = stepped.zoneKey !== zoneKeyRef.current;
      zoneKeyRef.current = stepped.zoneKey;

      setPreview(stepped.preview);

      if (zoneChanged) {
        onZoneTransitionRef.current?.(stepped.preview);
      }

      return stepped.preview;
    },
    [bootFsm, coords, userId, venues]
  );

  useEffect(() => {
    if (!enabled) return;
    if (!coords || venues.length === 0) return;

    applyStep();
  }, [enabled, coordsKey, venuesKey, coords, venues, applyStep, fsmBootTick]);

  useEffect(() => {
    if (!enabled || !coords || venues.length === 0 || !preview?.isSettlingHere) return;

    const id = setInterval(() => {
      applyStep(Date.now());
    }, SETTLING_TICK_MS);

    return () => clearInterval(id);
  }, [enabled, coordsKey, venuesKey, preview?.isSettlingHere, coords, venues, applyStep]);

  return preview;
}
