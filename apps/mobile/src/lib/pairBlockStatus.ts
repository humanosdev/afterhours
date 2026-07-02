import { supabase } from "./supabase/client";

export type PairBlockStatus = "none" | "you_blocked_them" | "they_blocked_you";

/** Mirrors web `idsBlockedWithMe`. */
export async function idsBlockedWithMe(meId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${meId},blocked_id.eq.${meId}`);

  const out = new Set<string>();
  for (const row of data ?? []) {
    const other = row.blocker_id === meId ? row.blocked_id : row.blocker_id;
    if (other) out.add(other);
  }
  return out;
}

/** Mirrors web `getBlockDirections`. */
export async function getBlockDirections(meId: string): Promise<{
  theyBlockedMe: Set<string>;
  iBlockedThem: Set<string>;
}> {
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${meId},blocked_id.eq.${meId}`);

  const theyBlockedMe = new Set<string>();
  const iBlockedThem = new Set<string>();
  for (const row of data ?? []) {
    if (row.blocker_id === meId) iBlockedThem.add(row.blocked_id);
    else theyBlockedMe.add(row.blocker_id);
  }
  return { theyBlockedMe, iBlockedThem };
}

/** Mirrors web `getPairBlockStatus`. */
export async function getPairBlockStatus(meId: string, otherId: string): Promise<PairBlockStatus> {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`and(blocker_id.eq.${meId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${meId})`)
    .maybeSingle();

  if (error || !data) return "none";
  if (data.blocker_id === meId) return "you_blocked_them";
  return "they_blocked_you";
}

/** Sync gate — PWA `/u/[username]` moment load + profile content visibility. */
export function canViewProfileOwnerContent(opts: {
  isOwn: boolean;
  isPrivate: boolean;
  isFriend: boolean;
  blockRestricted: boolean;
  profileInactive?: boolean;
}): boolean {
  if (opts.isOwn) return true;
  if (opts.profileInactive) return false;
  if (opts.blockRestricted) return false;
  if (opts.isPrivate && !opts.isFriend) return false;
  return true;
}

/** Mirrors web `viewerCanSeeOwnerPosts` — blocks + private account friend gate. */
export async function viewerCanSeeOwnerPosts(
  viewerId: string | null,
  ownerUserId: string
): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === ownerUserId) return true;
  const block = await getPairBlockStatus(viewerId, ownerUserId);
  if (block !== "none") return false;

  const { data: prof } = await supabase.from("profiles").select("is_private").eq("id", ownerUserId).maybeSingle();
  if (!prof) return false;
  if (!prof.is_private) return true;

  const { data: rel } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${viewerId},addressee_id.eq.${ownerUserId}),and(requester_id.eq.${ownerUserId},addressee_id.eq.${viewerId})`
    )
    .maybeSingle();

  return !!rel;
}
