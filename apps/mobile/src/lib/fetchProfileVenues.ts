import { supabase } from "./supabase/client";

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

/** Permanent profile venues — one row per venue, sorted by most recently earned. */
export async function fetchProfileVenues(userId: string): Promise<{
  venues: ProfileVenueRow[];
  error: string | null;
}> {
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
