import type { SupabaseClient } from "@supabase/supabase-js";

/** Shared with `AppShell` background pings (map uses tighter `watchPosition` elsewhere). */
export const SHELL_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 8000,
  timeout: 22_000,
};

/**
 * Minimal lat/lng ping when **no venue list** is available (e.g. venues fetch failed).
 * Prefer `syncUserPresenceWithVenuesFromCoords` from `@/lib/userPresenceVenueSync` on shell routes when venues are loaded.
 */
export async function upsertUserPresenceLatLng(
  supabase: SupabaseClient,
  args: { userId: string; lat: number; lng: number }
) {
  return supabase.from("user_presence").upsert(
    {
      user_id: args.userId,
      lat: args.lat,
      lng: args.lng,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/**
 * Strip venue context while keeping last coordinates (ghost / “stop sharing venue” UX).
 * Map should call this when `ghost_mode` is on so friends never read a stale `venue_id`.
 */
export async function upsertUserPresenceGhostSafeCoords(
  supabase: SupabaseClient,
  args: {
    userId: string;
    lat: number;
    lng: number;
  }
) {
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
