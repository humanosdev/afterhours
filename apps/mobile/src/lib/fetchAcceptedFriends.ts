import type { AcceptedFriendPublic } from "../types/friend";
import { supabase } from "./supabase/client";

const PROFILE_COLUMNS = "id, username, display_name, avatar_url" as const;
/** PostgREST URL length safety — batch `in()` filters. */
const ID_CHUNK_SIZE = 80;

export type FetchAcceptedFriendsResult = {
  friends: AcceptedFriendPublic[];
  error: string | null;
};

type EdgeRow = { requester_id: string; addressee_id: string };
type BlockRow = { blocker_id: string; blocked_id: string };

/**
 * Read-only accepted friends for the signed-in user, mirroring web
 * `acceptedFriendIdsExcludingBlocks` in `apps/web/src/lib/pairBlockStatus.ts`:
 * `friend_requests` (accepted) → subtract `blocks` → keep `profiles` with `account_lifecycle_state = active`.
 *
 * Phase 2K — no writes, no `user_presence`, no location.
 */
export async function fetchAcceptedFriends(meId: string): Promise<FetchAcceptedFriendsResult> {
  const { data: edgeData, error: edgeError } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`);

  if (edgeError) {
    return { friends: [], error: edgeError.message };
  }

  const edges = (edgeData ?? []) as EdgeRow[];
  if (edges.length === 0) {
    return { friends: [], error: null };
  }

  const { data: blockData, error: blockError } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${meId},blocked_id.eq.${meId}`);

  if (blockError) {
    return { friends: [], error: blockError.message };
  }

  const blocked = new Set<string>();
  for (const row of (blockData ?? []) as BlockRow[]) {
    const other = row.blocker_id === meId ? row.blocked_id : row.blocker_id;
    if (other) blocked.add(other);
  }

  const candidate = new Set<string>();
  for (const r of edges) {
    const other = r.requester_id === meId ? r.addressee_id : r.requester_id;
    if (other && other !== meId && !blocked.has(other)) candidate.add(other);
  }

  if (candidate.size === 0) {
    return { friends: [], error: null };
  }

  const ids = Array.from(candidate);
  const profiles: AcceptedFriendPublic[] = [];

  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + ID_CHUNK_SIZE);
    const { data: profData, error: profError } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("id", chunk)
      .eq("account_lifecycle_state", "active");

    if (profError) {
      return { friends: [], error: profError.message };
    }

    for (const row of (profData ?? []) as AcceptedFriendPublic[]) {
      if (row?.id) profiles.push(row);
    }
  }

  profiles.sort((a, b) => {
    const an = (a.display_name?.trim() || a.username || a.id).toLowerCase();
    const bn = (b.display_name?.trim() || b.username || b.id).toLowerCase();
    return an.localeCompare(bn);
  });

  return { friends: profiles, error: null };
}
