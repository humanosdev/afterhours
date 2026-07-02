import * as Location from "expo-location";
import { isValidCoordinatePair, type GpsDutyCycleMode } from "@intencity/shared";
import { acceptDeviceFix, type DeviceFixSample } from "./deviceLocationFilters";

export type DeviceCoords = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  recordedAtMs: number;
};

export type ForegroundLocationPermission = "undetermined" | "granted" | "denied";

export type ForegroundLocationWatchOptions = {
  /** Map tab focus — tighter watch cadence (EVOLVE-1). */
  highPrecision?: boolean;
  /** Phase 4.2 — low-power watch when stationary inside venue inner zone. */
  dutyCycleMode?: GpsDutyCycleMode;
};

type ForegroundWatchProfile = {
  accuracy: Location.LocationAccuracy;
  distanceInterval: number;
  timeInterval: number;
  fetchHighPrecision: boolean;
};

function resolveForegroundWatchProfile(
  options?: ForegroundLocationWatchOptions
): ForegroundWatchProfile {
  if (options?.dutyCycleMode === "stationary") {
    return {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25,
      timeInterval: 15_000,
      fetchHighPrecision: false,
    };
  }

  const highPrecision = options?.highPrecision === true;
  return {
    accuracy: highPrecision ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
    distanceInterval: highPrecision ? 3 : 8,
    timeInterval: highPrecision ? 2000 : 5000,
    fetchHighPrecision: highPrecision,
  };
}

/** Mirrors web map `watchPosition` — keep last real fix on error, never invent coords. */
export async function requestForegroundLocationPermission(): Promise<ForegroundLocationPermission> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return "granted";
  if (!existing.canAskAgain && existing.status === "denied") return "denied";

  const next = await Location.requestForegroundPermissionsAsync();
  if (next.granted) return "granted";
  return "denied";
}

export function coordsFromPosition(pos: Location.LocationObject): DeviceCoords | null {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  if (!isValidCoordinatePair(lat, lng)) return null;
  const accuracy = pos.coords.accuracy;
  return {
    lat,
    lng,
    accuracyM: typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null,
    recordedAtMs: pos.timestamp ?? Date.now(),
  };
}

function applyFilteredFix(
  raw: DeviceCoords | null,
  lastAcceptedRef: { current: DeviceFixSample | null },
  onCoords: (coords: DeviceCoords) => void
): DeviceCoords | null {
  if (!raw) return lastAcceptedRef.current;
  const sample: DeviceFixSample = {
    lat: raw.lat,
    lng: raw.lng,
    accuracyM: raw.accuracyM,
    recordedAtMs: raw.recordedAtMs,
  };
  if (!acceptDeviceFix(sample, lastAcceptedRef.current)) {
    return lastAcceptedRef.current;
  }
  lastAcceptedRef.current = sample;
  onCoords(raw);
  return raw;
}

/** One-shot read (web `getCurrentPosition` on focus). */
export async function fetchCurrentDeviceCoords(options?: {
  /** Background refresh after locate — faster, does not block UI. */
  balanced?: boolean;
  highPrecision?: boolean;
  lastAccepted?: DeviceFixSample | null;
}): Promise<DeviceCoords | null> {
  const perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) return null;
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy:
        options?.highPrecision === false || options?.balanced
          ? Location.Accuracy.Balanced
          : Location.Accuracy.High,
    });
    const raw = coordsFromPosition(pos);
    if (!raw) return options?.lastAccepted ?? null;
    const sample: DeviceFixSample = {
      lat: raw.lat,
      lng: raw.lng,
      accuracyM: raw.accuracyM,
      recordedAtMs: raw.recordedAtMs,
    };
    if (!acceptDeviceFix(sample, options?.lastAccepted ?? null)) {
      return options?.lastAccepted ?? null;
    }
    return raw;
  } catch {
    return options?.lastAccepted ?? null;
  }
}

export type ForegroundLocationWatch = {
  stop: () => void;
};

/** Foreground watch — PWA `watchPosition` equivalent; filters accuracy + teleport. */
export async function startForegroundLocationWatch(
  onCoords: (coords: DeviceCoords) => void,
  options?: ForegroundLocationWatchOptions
): Promise<ForegroundLocationWatch | null> {
  const perm = await requestForegroundLocationPermission();
  if (perm !== "granted") return null;

  const lastAcceptedRef = { current: null as DeviceFixSample | null };
  const profile = resolveForegroundWatchProfile(options);

  const initial = await fetchCurrentDeviceCoords({ highPrecision: profile.fetchHighPrecision });
  if (initial) {
    applyFilteredFix(initial, lastAcceptedRef, onCoords);
  }

  const sub = await Location.watchPositionAsync(
    {
      accuracy: profile.accuracy,
      distanceInterval: profile.distanceInterval,
      timeInterval: profile.timeInterval,
    },
    (pos) => {
      const raw = coordsFromPosition(pos);
      applyFilteredFix(raw, lastAcceptedRef, onCoords);
    }
  );

  return { stop: () => sub.remove() };
}
