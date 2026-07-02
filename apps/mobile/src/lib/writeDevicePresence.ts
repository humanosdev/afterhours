import type { VenuePublic } from "../types/venue";
import { syncUserPresenceWithVenuesFromCoords } from "./syncUserPresenceWithVenuesFromCoords";
import { upsertUserPresenceGhostSafeCoords, upsertUserPresenceLatLng } from "./userPresenceWrite";

/** One device fix → DB row (full FSM when venues exist, lat/lng ping otherwise). */
export async function writeDevicePresence(args: {
  userId: string;
  lat: number;
  lng: number;
  venues: VenuePublic[];
  myGhostMode: boolean;
  actorLabel?: string | null;
}): Promise<{ error: Error | null }> {
  if (args.myGhostMode) {
    const { error } = await upsertUserPresenceGhostSafeCoords({
      userId: args.userId,
      lat: args.lat,
      lng: args.lng,
    });
    return { error: error ? new Error(error.message) : null };
  }

  if (args.venues.length === 0) {
    const { error } = await upsertUserPresenceLatLng({
      userId: args.userId,
      lat: args.lat,
      lng: args.lng,
    });
    return { error: error ? new Error(error.message) : null };
  }

  return syncUserPresenceWithVenuesFromCoords(args);
}
