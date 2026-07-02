import { syncUserPresenceWithVenuesFromCoords } from "./syncUserPresenceWithVenuesFromCoords";
import { upsertUserPresenceGhostSafeCoords } from "../lib/userPresenceWrite";
import { setCachedMyProfile } from "./myProfileCache";
import { supabase } from "./supabase/client";
import type { MyProfile } from "../types/profile";
import type { VenuePublic } from "../types/venue";

/** Ghost pill — updates `profiles.ghost_mode` + presence row immediately. */
export async function toggleGhostMode(
  userId: string,
  next: boolean,
  prior: MyProfile | null,
  opts?: {
    coords?: { lat: number; lng: number } | null;
    venues?: VenuePublic[];
  }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("profiles").update({ ghost_mode: next }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  if (prior) setCachedMyProfile(userId, { ...prior, ghost_mode: next });

  if (opts?.coords) {
    if (next) {
      const { error: upErr } = await upsertUserPresenceGhostSafeCoords({
        userId,
        lat: opts.coords.lat,
        lng: opts.coords.lng,
      });
      if (upErr) return { ok: false, error: upErr.message };
    } else if (opts.venues?.length) {
      const { error: syncErr } = await syncUserPresenceWithVenuesFromCoords({
        userId,
        lat: opts.coords.lat,
        lng: opts.coords.lng,
        venues: opts.venues,
        myGhostMode: false,
      });
      if (syncErr) return { ok: false, error: syncErr.message };
    }
  }

  return { ok: true };
}
