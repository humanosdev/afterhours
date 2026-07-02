import { useEffect, useRef } from "react";
import { profileUsernameLabel } from "../lib/profileDisplay";
import {
  NATIVE_PRESENCE_WRITE_MAP_MS,
  NATIVE_PRESENCE_WRITE_SHELL_MS,
  shouldWritePresenceForFix,
} from "../lib/nativePresenceWrite";
import { writeDevicePresence } from "../lib/writeDevicePresence";
import { getCachedMapLastLocation } from "../lib/mapLastLocationCache";
import type { StableZoneSnapshot } from "@intencity/shared";
import type { DeviceCoords } from "../lib/nativeForegroundLocation";
import type { VenuePublic } from "../types/venue";
import type { MyProfile } from "../types/profile";

/**
 * Phase 2 + pre-prep — interval heartbeat plus GPS movement-triggered writes (foreground only).
 */
export function useNativePresenceWrite(args: {
  enabled: boolean;
  userId: string | undefined;
  profile: MyProfile | null | undefined;
  coords: DeviceCoords | null;
  venues: VenuePublic[];
  mapWriteBoost: boolean;
}) {
  const { enabled, userId, profile, coords, venues, mapWriteBoost } = args;
  const coordsRef = useRef(coords);
  const profileRef = useRef(profile);
  const venuesRef = useRef(venues);
  const userIdRef = useRef(userId);
  const inFlightRef = useRef(false);
  const lastWriteAtRef = useRef(0);
  const lastWrittenFixRef = useRef<{ lat: number; lng: number } | null>(null);
  const stableZoneRef = useRef<StableZoneSnapshot | null>(null);

  coordsRef.current = coords;
  profileRef.current = profile;
  venuesRef.current = venues;
  userIdRef.current = userId;

  const venuesKey = venues.map((v) => v.id).join(",");
  const coordsKey =
    coords == null ? null : `${coords.lat}:${coords.lng}:${coords.recordedAtMs ?? 0}`;

  useEffect(() => {
    stableZoneRef.current = null;
    lastWriteAtRef.current = 0;
    lastWrittenFixRef.current = null;
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const heartbeatMs = mapWriteBoost
      ? NATIVE_PRESENCE_WRITE_MAP_MS
      : NATIVE_PRESENCE_WRITE_SHELL_MS;

    const resolveFix = (): DeviceCoords | null => {
      const cached = getCachedMapLastLocation();
      return (
        coordsRef.current ??
        (cached
          ? {
              lat: cached.lat,
              lng: cached.lng,
              accuracyM: null,
              recordedAtMs: cached.recordedAtMs,
            }
          : null)
      );
    };

    const maybeWrite = () => {
      const uid = userIdRef.current;
      const fix = resolveFix();
      if (!uid || !fix) return;

      const now = Date.now();
      if (inFlightRef.current) return;
      if (
        !shouldWritePresenceForFix({
          fix,
          lastWritten: lastWrittenFixRef.current,
          lastWriteAtMs: lastWriteAtRef.current,
          heartbeatMs,
          nowMs: now,
        })
      ) {
        return;
      }

      lastWriteAtRef.current = now;
      inFlightRef.current = true;

      const currentProfile = profileRef.current;
      const actorLabel = currentProfile ? profileUsernameLabel(currentProfile, "You") : undefined;

      void writeDevicePresence({
        userId: uid,
        lat: fix.lat,
        lng: fix.lng,
        venues: venuesRef.current,
        myGhostMode: !!currentProfile?.ghost_mode,
        actorLabel,
        accuracyM: fix.accuracyM,
        stableZone: stableZoneRef.current,
      })
        .then(({ error, stableZone }) => {
          if (error) console.warn("[presence-write]", error.message);
          else {
            lastWrittenFixRef.current = { lat: fix.lat, lng: fix.lng };
            if (stableZone) stableZoneRef.current = stableZone;
          }
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    maybeWrite();
    const id = setInterval(maybeWrite, heartbeatMs);
    return () => clearInterval(id);
  }, [enabled, userId, mapWriteBoost, profile?.ghost_mode, venuesKey, coordsKey]);
}
