import { fetchAcceptedFriends } from "./fetchAcceptedFriends";
import { supabase } from "./supabase/client";

export type FriendsOfFriendsRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  mutualCount: number;
};

const CHUNK = 45;

async function fetchAcceptedEdgesForFriendChunk(
  chunk: string[]
): Promise<{ requester_id: string; addressee_id: string }[]> {
  if (!chunk.length) return [];
  const { data, error } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.in.(${chunk.join(",")}),addressee_id.in.(${chunk.join(",")})`);
  if (error) {
    console.warn("friends-of-friends edges:", error.message);
    return [];
  }
  return (data ?? []) as { requester_id: string; addressee_id: string }[];
}

/**
 * PWA `loadFriendsOfFriendsSuggestions` — read-only, no `user_presence`.
 */
export async function loadFriendsOfFriendsSuggestions(meId: string): Promise<FriendsOfFriendsRow[]> {
  const { friends, error } = await fetchAcceptedFriends(meId);
  if (error || !friends.length) return [];

  const friendIds = friends.map((f) => f.id);
  const myFriends = new Set(friendIds);

  const { data: blockData } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${meId},blocked_id.eq.${meId}`);
  const blocked = new Set<string>();
  for (const row of blockData ?? []) {
    const other = row.blocker_id === meId ? row.blocked_id : row.blocker_id;
    if (other) blocked.add(other);
  }

  const { data: pendingOut } = await supabase
    .from("friend_requests")
    .select("addressee_id")
    .eq("requester_id", meId)
    .eq("status", "pending");
  const pendingOutgoing = new Set(
    (pendingOut ?? []).map((r: { addressee_id: string }) => r.addressee_id)
  );

  const edgeRows: { requester_id: string; addressee_id: string }[] = [];
  const seenPair = new Set<string>();
  for (let i = 0; i < friendIds.length; i += CHUNK) {
    const chunk = friendIds.slice(i, i + CHUNK);
    const rows = await fetchAcceptedEdgesForFriendChunk(chunk);
    for (const r of rows) {
      const key = [r.requester_id, r.addressee_id].sort().join(":");
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      edgeRows.push(r);
    }
  }

  const mutualByCandidate = new Map<string, Set<string>>();

  for (const row of edgeRows) {
    const a = row.requester_id;
    const b = row.addressee_id;
    let candidate: string | null = null;
    let mutualFriend: string | null = null;
    if (myFriends.has(a) && !myFriends.has(b) && b !== meId) {
      candidate = b;
      mutualFriend = a;
    } else if (myFriends.has(b) && !myFriends.has(a) && a !== meId) {
      candidate = a;
      mutualFriend = b;
    }
    if (!candidate || !mutualFriend) continue;
    if (myFriends.has(candidate)) continue;
    if (candidate === meId) continue;
    if (blocked.has(candidate)) continue;
    if (pendingOutgoing.has(candidate)) continue;

    let set = mutualByCandidate.get(candidate);
    if (!set) {
      set = new Set();
      mutualByCandidate.set(candidate, set);
    }
    set.add(mutualFriend);
  }

  const candidateIds = Array.from(mutualByCandidate.keys());
  if (!candidateIds.length) return [];

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, account_lifecycle_state")
    .in("id", candidateIds);
  if (profErr) {
    console.warn("friends-of-friends profiles:", profErr.message);
    return [];
  }

  const rows: FriendsOfFriendsRow[] = (profiles ?? [])
    .filter(
      (p: { account_lifecycle_state?: string | null }) =>
        (p.account_lifecycle_state ?? "active") === "active"
    )
    .map(
      (p: {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }) => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        mutualCount: mutualByCandidate.get(p.id)?.size ?? 0,
      })
    )
    .filter((p) => p.mutualCount > 0);

  rows.sort((a, b) => {
    if (b.mutualCount !== a.mutualCount) return b.mutualCount - a.mutualCount;
    const an = (a.display_name || a.username || "").toLowerCase();
    const bn = (b.display_name || b.username || "").toLowerCase();
    return an.localeCompare(bn);
  });

  return rows.slice(0, 24);
}
