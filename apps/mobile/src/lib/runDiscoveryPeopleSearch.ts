import type { SupabaseClient } from "@supabase/supabase-js";
import { searchProfilesDiscovery, type ProfileDiscoveryHit } from "./searchProfilesDiscovery";

/**
 * PWA `/search` people merge: accepted friends matched locally first, then RPC/discovery hits.
 */
export async function runDiscoveryPeopleSearch(
  supabase: SupabaseClient,
  meId: string,
  debouncedNeedle: string,
  acceptedFriends: ProfileDiscoveryHit[]
): Promise<ProfileDiscoveryHit[]> {
  const qNorm = debouncedNeedle.trim().toLowerCase().replace(/^@/, "");
  if (!qNorm) return [];

  const friendMatches: ProfileDiscoveryHit[] = [];
  const friendSeen = new Set<string>();
  for (const row of acceptedFriends) {
    if (!row?.id) continue;
    const d = (row.display_name ?? "").toLowerCase();
    const u = (row.username ?? "").toLowerCase();
    if (!d.includes(qNorm) && !u.includes(qNorm)) continue;
    friendMatches.push(row);
    friendSeen.add(row.id);
  }

  const peopleRows = await searchProfilesDiscovery(supabase, meId, debouncedNeedle);
  const others: ProfileDiscoveryHit[] = [];
  for (const p of peopleRows) {
    if (friendSeen.has(p.id)) continue;
    others.push(p);
  }

  return [...friendMatches, ...others];
}
