import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  INITIAL_GPS_DUTY_CYCLE_STATE,
  isInnerZoneAtCoords,
  stepGpsDutyCycle,
  type GpsDutyCycleMode,
} from "@intencity/shared";
import type { DeviceFixSample } from "../lib/deviceLocationFilters";
import {
  fetchCurrentDeviceCoords,
  requestForegroundLocationPermission,
  startForegroundLocationWatch,
  type DeviceCoords,
  type ForegroundLocationPermission,
} from "../lib/nativeForegroundLocation";
import {
  getCachedMapLastLocation,
  setCachedMapLastLocation,
} from "../lib/mapLastLocationCache";
import { venuesForPresenceSync } from "../lib/venuesForPresenceSync";
import type { VenuePublic } from "../types/venue";

export type UseForegroundLocationOptions = {
  /** EVOLVE-1 — map tab focus: 2s watch + accuracy filter. */
  highPrecision?: boolean;
  /** Phase 4.2 — venue catalog enables inner-zone stationary GPS throttle. */
  venues?: VenuePublic[];
};

/**
 * P2O-B / EVOLVE-1 — device coordinates while Map (or other surfaces) are mounted.
 * Read-only acquisition; no `user_presence` writes (P2O-D / Era 5).
 */
export function useForegroundLocation(enabled: boolean, options?: UseForegroundLocationOptions) {
  const highPrecision = options?.highPrecision === true;
  const venues = options?.venues ?? [];
  const venuesKey = venues.map((v) => v.id).join(",");
  const dutyStateRef = useRef(INITIAL_GPS_DUTY_CYCLE_STATE);
  const [dutyCycleMode, setDutyCycleMode] = useState<GpsDutyCycleMode>("active");
  const [permission, setPermission] = useState<ForegroundLocationPermission>("undetermined");
  const [coords, setCoords] = useState<DeviceCoords | null>(() => {
    const cached = getCachedMapLastLocation();
    if (!cached) return null;
    return {
      lat: cached.lat,
      lng: cached.lng,
      accuracyM: null,
      recordedAtMs: cached.recordedAtMs,
    };
  });

  useEffect(() => {
    if (!coords || venues.length === 0) {
      dutyStateRef.current = INITIAL_GPS_DUTY_CYCLE_STATE;
      setDutyCycleMode("active");
      return;
    }

    const syncVenues = venuesForPresenceSync(venues);
    const inner = isInnerZoneAtCoords({
      lat: coords.lat,
      lng: coords.lng,
      venues: syncVenues,
    });
    const next = stepGpsDutyCycle({
      state: dutyStateRef.current,
      lat: coords.lat,
      lng: coords.lng,
      isInnerZone: inner,
      nowMs: coords.recordedAtMs ?? Date.now(),
    });
    dutyStateRef.current = next;
    setDutyCycleMode((prev) => (prev === next.mode ? prev : next.mode));
  }, [coords?.lat, coords?.lng, coords?.recordedAtMs, venuesKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let watchStop: (() => void) | null = null;

    void (async () => {
      const perm = await requestForegroundLocationPermission();
      if (cancelled) return;
      setPermission(perm);
      if (perm !== "granted") return;

      const watch = await startForegroundLocationWatch((next) => {
        if (cancelled) return;
        setCachedMapLastLocation({
          lat: next.lat,
          lng: next.lng,
          recordedAtMs: next.recordedAtMs,
        });
        setCoords(next);
      }, { highPrecision, dutyCycleMode });
      if (cancelled) {
        watch?.stop();
        return;
      }
      watchStop = watch?.stop ?? null;
    })();

    return () => {
      cancelled = true;
      watchStop?.();
      watchStop = null;
    };
  }, [enabled, highPrecision, dutyCycleMode]);

  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  const lastAcceptedRef = useRef<DeviceFixSample | null>(null);
  if (coords) {
    lastAcceptedRef.current = {
      lat: coords.lat,
      lng: coords.lng,
      accuracyM: coords.accuracyM,
      recordedAtMs: coords.recordedAtMs,
    };
  }

  const refresh = useCallback(async (refreshOptions?: { balanced?: boolean }): Promise<DeviceCoords | null> => {
    const next = await fetchCurrentDeviceCoords({
      balanced: refreshOptions?.balanced,
      highPrecision: dutyCycleMode === "stationary" ? false : highPrecision,
      lastAccepted: lastAcceptedRef.current,
    });
    if (next) {
      setCachedMapLastLocation({
        lat: next.lat,
        lng: next.lng,
        recordedAtMs: next.recordedAtMs,
      });
      setCoords(next);
    }
    return next ?? coordsRef.current;
  }, [highPrecision, dutyCycleMode]);

  /** P2O-B slice 2 — PWA `visibilitychange` resume refresh. */
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh({ balanced: true });
    });
    return () => sub.remove();
  }, [enabled, refresh]);

  return { permission, coords, refresh, dutyCycleMode };
}
