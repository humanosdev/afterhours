import { isValidCoordinatePair } from "@intencity/shared";
import type { DeviceCoords } from "./nativeForegroundLocation";
import type { UserPresenceRow } from "../types/presence";
import type { VenuePublic } from "../types/venue";

export type MapLocateTarget = {
  lat: number;
  lng: number;
  source: "sheet" | "you";
};

/**
 * PWA `runLocateCycle` priority: sheet venue → check-in venue → device fix.
 */
export function resolveMapLocateTarget(args: {
  selectedVenue: VenuePublic | null;
  you: DeviceCoords | null;
  meId?: string | null;
  presence?: UserPresenceRow[];
  venues?: VenuePublic[];
}): MapLocateTarget | null {
  const { selectedVenue, you, meId, presence = [], venues = [] } = args;

  if (selectedVenue && isValidCoordinatePair(selectedVenue.lat, selectedVenue.lng)) {
    return {
      lat: selectedVenue.lat as number,
      lng: selectedVenue.lng as number,
      source: "sheet",
    };
  }

  if (meId && venues.length) {
    const mine = presence.find((p) => p.user_id === meId);
    const vid = mine?.venue_id;
    if (vid) {
      const v = venues.find((x) => x.id === vid);
      if (v && isValidCoordinatePair(v.lat, v.lng)) {
        return { lat: v.lat as number, lng: v.lng as number, source: "you" };
      }
    }
  }

  if (you && isValidCoordinatePair(you.lat, you.lng)) {
    return { lat: you.lat, lng: you.lng, source: "you" };
  }

  const mine = meId ? presence.find((p) => p.user_id === meId) : undefined;
  if (mine && isValidCoordinatePair(mine.lat, mine.lng)) {
    return { lat: mine.lat, lng: mine.lng, source: "you" };
  }

  return null;
}

/** PWA locate zoom steps: first ~15.5, second ~1.65 world. */
export function locateZoomForCycleStep(step: 0 | 1): number {
  return step === 0 ? 15.5 : 1.65;
}

/** Zoom at/below this is treated as world/regional view — next locate always zooms to you. */
export const MAP_LOCATE_WORLD_ZOOM_THRESHOLD = 8;

/** Keep locate cycle aligned when the user pans/zooms manually (ref can disagree with map zoom). */
export function resolveLocateCycleStep(cycleStep: 0 | 1, currentZoom: number): 0 | 1 {
  if (currentZoom <= MAP_LOCATE_WORLD_ZOOM_THRESHOLD) return 0;
  return cycleStep;
}
