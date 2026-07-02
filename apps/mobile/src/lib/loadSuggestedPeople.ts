import { fetchAcceptedFriends } from "./fetchAcceptedFriends";
import { loadFriendsOfFriendsSuggestions } from "./friendsOfFriends";
import { supabase } from "./supabase/client";

export type SuggestedPersonRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  source: "mutual" | "discover";
  mutualCount: number;
};

const DEFAULT_LIMIT = 24;
const DISCOVER_FETCH_MULTIPLIER = 4;

export function suggestedPersonSubtitle(row: SuggestedPersonRow): string {
  if (row.source === "mutual") {
    return row.mutualCount === 1 ? "1 mutual friend" : `${row.mutualCount} mutual friends`;
  }
  return "On Intencity";
}

export function suggestedPersonDisplayName(row: {
  display_name: string | null;
  username: string | null;
}): string {
  return row.display_name?.trim() || row.username?.trim() || "User";
}

async function loadDiscoverPeopleFallback(
  meId: string,
  excludeIds: Set<string>,
  limit: number
): Promise<SuggestedPersonRow[]> {
  if (limit <= 0) return [];

  const [{ friends }, { data: blockData }, { data: pendingOut }] = await Promise.all([
    fetchAcceptedFriends(meId),
    supabase.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${meId},blocked_id.eq.${meId}`),
    supabase
      .from("friend_requests")
      .select("addressee_id")
      .eq("requester_id", meId)
      .eq("status", "pending"),
  ]);

  const friendIds = new Set(friends.map((f) => f.id));
  const blocked = new Set<string>();
  for (const row of blockData ?? []) {
    const other = row.blocker_id === meId ? row.blocked_id : row.blocker_id;
    if (other) blocked.add(other);
  }
  const pendingOutgoing = new Set(
    (pendingOut ?? []).map((r: { addressee_id: string }) => r.addressee_id)
  );

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, account_lifecycle_state")
    .neq("id", meId)
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * DISCOVER_FETCH_MULTIPLIER, 24));

  if (error || !data) {
    console.warn("loadDiscoverPeopleFallback:", error?.message);
    return [];
  }

  const rows: SuggestedPersonRow[] = [];
  for (const p of data) {
    if (rows.length >= limit) break;
    const id = String(p.id);
    if (excludeIds.has(id)) continue;
    if (friendIds.has(id)) continue;
    if (blocked.has(id)) continue;
    if (pendingOutgoing.has(id)) continue;
    if ((p.account_lifecycle_state ?? "active") !== "active") continue;
    if (!p.username?.trim()) continue;

    rows.push({
      id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      source: "discover",
      mutualCount: 0,
    });
  }

  return rows;
}

/**
 * FoF suggestions first, then active profiles for new users with no mutual graph.
 * Shared by discovery search explore + hub suggestions popup.
 */
export async function loadSuggestedPeople(
  meId: string,
  limit = DEFAULT_LIMIT
): Promise<SuggestedPersonRow[]> {
  const fofRows = await loadFriendsOfFriendsSuggestions(meId);
  const mutual: SuggestedPersonRow[] = fofRows.map((row) => ({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    source: "mutual" as const,
    mutualCount: row.mutualCount,
  }));

  if (mutual.length >= limit) {
    return mutual.slice(0, limit);
  }

  const exclude = new Set(mutual.map((row) => row.id));
  const discover = await loadDiscoverPeopleFallback(meId, exclude, limit - mutual.length);
  return [...mutual, ...discover];
}
