import { supabase } from "./supabase/client";

/** Strip venue context while keeping last coordinates (ghost UX). */
export async function upsertUserPresenceGhostSafeCoords(args: {
  userId: string;
  lat: number;
  lng: number;
}) {
  return supabase.from("user_presence").upsert(
    {
      user_id: args.userId,
      lat: args.lat,
      lng: args.lng,
      venue_id: null,
      zone_type: null,
      venue_state: "outside",
      entered_inner_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/** Minimal lat/lng ping when venue list unavailable. */
export async function upsertUserPresenceLatLng(args: {
  userId: string;
  lat: number;
  lng: number;
}) {
  return supabase.from("user_presence").upsert(
    {
      user_id: args.userId,
      lat: args.lat,
      lng: args.lng,
      venue_id: null,
      zone_type: null,
      venue_state: "outside",
      entered_inner_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/** Drop live presence on sign-out so friends do not read a frozen venue pin. */
export async function clearUserPresenceOnSignOut(userId: string) {
  if (!userId) return { error: null };
  return supabase.from("user_presence").delete().eq("user_id", userId);
}
