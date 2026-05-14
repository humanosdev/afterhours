import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Block graph helpers — rules are symmetric for both users:
 * any row in `public.blocks` between A and B (either direction) means no messaging,
 * no friend-request acceptance, and neither treats the other as a “friend” in UI lists/counts
 * until the block is removed (unfriend alone does not add a block; both can search again).
 */
export type PairBlockStatus = "none" | "you_blocked_them" | "they_blocked_you";

/** At most one row per ordered pair in `public.blocks`; either direction is mutual exclusion for messaging. */
export async function getPairBlockStatus(
  supabase: SupabaseClient,
  meId: string,
  otherId: string
): Promise<PairBlockStatus> {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${meId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${meId})`
    )
    .maybeSingle();

  if (error || !data) return "none";
  if (data.blocker_id === meId) return "you_blocked_them";
  return "they_blocked_you";
}

/** User ids involved in any block with `meId` (either direction). */
export async function idsBlockedWithMe(supabase: SupabaseClient, meId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${meId},blocked_id.eq.${meId}`);

  const out = new Set<string>();
  for (const row of data ?? []) {
    const r = row as { blocker_id: string; blocked_id: string };
    const other = r.blocker_id === meId ? r.blocked_id : r.blocker_id;
    if (other) out.add(other);
  }
  return out;
}

/**
 * Accepted friend user ids for `meId`, excluding anyone in an active block with `meId`
 * (either direction). Same rule everywhere: blocked pairs are not “friends” for UI, map, chat picker, or counts.
 */
export async function acceptedFriendIdsExcludingBlocks(
  supabase: SupabaseClient,
  meId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`);

  if (!data?.length) return [];

  const blocked = await idsBlockedWithMe(supabase, meId);
  const candidate = new Set<string>();
  for (const r of data as { requester_id: string; addressee_id: string }[]) {
    const other = r.requester_id === meId ? r.addressee_id : r.requester_id;
    if (other && other !== meId && !blocked.has(other)) candidate.add(other);
  }
  if (!candidate.size) return [];

  const { data: activeRows } = await supabase
    .from("profiles")
    .select("id")
    .in("id", Array.from(candidate))
    .eq("account_lifecycle_state", "active");

  const active = new Set((activeRows ?? []).map((row) => (row as { id: string }).id));
  return Array.from(candidate).filter((id) => active.has(id));
}
