import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { DeviceFixSample } from "../lib/deviceLocationFilters";
import {
  getCachedMapLastLocation,
  setCachedMapLastLocation,
} from "../lib/mapLastLocationCache";
import {
  fetchCurrentDeviceCoords,
  requestForegroundLocationPermission,
  startForegroundLocationWatch,
  type DeviceCoords,
  type ForegroundLocationPermission,
} from "../lib/nativeForegroundLocation";

export type UseForegroundLocationOptions = {
  /** EVOLVE-1 — map tab focus: 2s watch + accuracy filter. */
  highPrecision?: boolean;
};

/**
 * P2O-B / EVOLVE-1 — device coordinates while Map (or other surfaces) are mounted.
 * Read-only acquisition; no `user_presence` writes (P2O-D / Era 5).
 */
export function useForegroundLocation(enabled: boolean, options?: UseForegroundLocationOptions) {
  const highPrecision = options?.highPrecision === true;
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
      }, { highPrecision });
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
  }, [enabled, highPrecision]);

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
      highPrecision,
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
  }, [highPrecision]);

  /** P2O-B slice 2 — PWA `visibilitychange` resume refresh. */
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh({ balanced: true });
    });
    return () => sub.remove();
  }, [enabled, refresh]);

  return { permission, coords, refresh };
}
