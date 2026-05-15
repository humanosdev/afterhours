import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileDiscoveryHit = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function escapeLike(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * People hits for hub/discovery search. Prefer `search_profiles_discovery` RPC (sees private
 * accounts for username/display match). Falls back to RLS-bound `profiles` ilike if RPC not deployed.
 */
export async function searchProfilesDiscovery(
  supabase: SupabaseClient,
  meId: string,
  needle: string
): Promise<ProfileDiscoveryHit[]> {
  const trimmed = needle.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc("search_profiles_discovery", {
    p_needle: needle,
    p_limit: 20,
  });

  if (!error && data != null) {
    const arr = Array.isArray(data) ? (data as ProfileDiscoveryHit[]) : [];
    return arr.filter((r) => r?.id && r.id !== meId);
  }

  const msg = (error?.message ?? "").toLowerCase();
  const missingFn =
    error?.code === "PGRST202" ||
    error?.code === "42883" ||
    msg.includes("could not find the function") ||
    msg.includes("does not exist");

  if (!missingFn) {
    console.error("search_profiles_discovery RPC failed:", error);
    return [];
  }

  const esc = escapeLike(trimmed);
  const pattern = `%${esc}%`;
  const [dnRes, unRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .neq("id", meId)
      .ilike("display_name", pattern)
      .limit(20),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .neq("id", meId)
      .ilike("username", pattern)
      .limit(20),
  ]);
  const peopleMap = new Map<string, ProfileDiscoveryHit>();
  for (const row of [...(dnRes.data ?? []), ...(unRes.data ?? [])]) {
    if (row?.id) peopleMap.set(row.id, row as ProfileDiscoveryHit);
  }
  return [...peopleMap.values()];
}
