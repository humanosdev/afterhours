import type { VenuePublic } from "../types/venue";
import type { MapLastLocation } from "./mapLastLocationCache";

/** Mean lat/lng of geocoded venues — stable boot anchor when GPS is still resolving. */
export function venueCentroid(venues: VenuePublic[]): { lat: number; lng: number } | null {
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const v of venues) {
    if (typeof v.lat !== "number" || !Number.isFinite(v.lat)) continue;
    if (typeof v.lng !== "number" || !Number.isFinite(v.lng)) continue;
    sumLat += v.lat;
    sumLng += v.lng;
    n += 1;
  }
  if (!n) return null;
  return { lat: sumLat / n, lng: sumLng / n };
}

/** First paint anchor for imperative map boot (frozen after first non-null). */
export function resolveMapBootCenterSeed(args: {
  youCoords: { lat: number; lng: number } | null;
  cachedLocation: MapLastLocation | null;
  selfPresence: { lat: number; lng: number } | null;
  venues: VenuePublic[];
}): { lat: number; lng: number } | null {
  if (args.youCoords) return args.youCoords;
  if (args.cachedLocation) return { lat: args.cachedLocation.lat, lng: args.cachedLocation.lng };
  if (args.selfPresence) return args.selfPresence;
  return venueCentroid(args.venues);
}

/** You-marker / distance helpers — GPS when granted, else last-known or DB presence. */
export function resolveMapYouCoords(args: {
  permission: "undetermined" | "granted" | "denied";
  youCoords: { lat: number; lng: number } | null;
  cachedLocation: MapLastLocation | null;
  selfPresence: { lat: number; lng: number } | null;
}): { lat: number; lng: number } | null {
  if (args.permission === "granted" && args.youCoords) return args.youCoords;
  if (args.permission === "denied") return args.selfPresence;
  return args.youCoords ?? (args.cachedLocation ? { lat: args.cachedLocation.lat, lng: args.cachedLocation.lng } : null) ?? args.selfPresence;
}
