import type { SupabaseClient } from "@supabase/supabase-js";
import { hasProfileVenueDwell } from "@intencity/shared";

export type ProfileVenueRow = {
  id: string;
  name: string;
  category: string | null;
  earned_at: string;
};

type RawProfileVenueRow = {
  earned_at: string;
  venues:
    | { id: string; name: string; category: string | null }
    | { id: string; name: string; category: string | null }[]
    | null;
};

function normalizeVenueJoin(
  venues: RawProfileVenueRow["venues"]
): { id: string; name: string; category: string | null } | null {
  if (!venues) return null;
  if (Array.isArray(venues)) return venues[0] ?? null;
  return venues;
}

/** Permanent profile venues — sorted by most recently earned. */
export async function fetchProfileVenuesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ venues: ProfileVenueRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("user_profile_venues")
    .select("earned_at, venues(id, name, category)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) {
    return { venues: [], error: error.message };
  }

  const venues: ProfileVenueRow[] = [];
  for (const row of (data ?? []) as RawProfileVenueRow[]) {
    const venue = normalizeVenueJoin(row.venues);
    if (!venue?.id || !venue.name?.trim()) continue;
    venues.push({
      id: venue.id,
      name: venue.name.trim(),
      category: venue.category ?? null,
      earned_at: row.earned_at,
    });
  }

  return { venues, error: null };
}

/** Idempotent earn — 15+ min inner dwell; deduped server-side. */
export async function maybeEarnProfileVenue(
  supabase: SupabaseClient,
  args: {
    userId: string;
    venueId: string | null;
    zoneType: string | null;
    enteredInnerAt: string | null;
  }
): Promise<void> {
  if (
    !hasProfileVenueDwell({
      zoneType: args.zoneType,
      venueId: args.venueId,
      enteredInnerAt: args.enteredInnerAt,
    })
  ) {
    return;
  }

  await supabase.rpc("maybe_earn_profile_venue", {
    p_user_id: args.userId,
    p_venue_id: args.venueId,
    p_zone_type: args.zoneType,
    p_entered_inner_at: args.enteredInnerAt,
  });
}
