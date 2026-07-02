import { isStoryRowShareFlag } from "./hubFeedSemantics";
import { viewerCanSeeOwnerPosts } from "./pairBlockStatus";
import type { ProfileShareRow } from "./fetchProfileShares";
import { invalidateSocialGraph } from "./socialGraphSync";
import { supabase } from "./supabase/client";

export type PublicProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean | null;
  ghost_mode: boolean | null;
  block_relation?: "they_blocked_you" | "you_blocked_them" | null;
  profile_inactive?: boolean;
};

export function profileFromRpc(data: unknown): PublicProfileRow | null {
  if (data === null || data === undefined || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  if (!username) return null;
  return {
    id: String(raw.id ?? ""),
    username,
    display_name: (raw.display_name as string | null) ?? null,
    bio: (raw.bio as string | null) ?? null,
    avatar_url: (raw.avatar_url as string | null) ?? null,
    is_private: (raw.is_private as boolean | null) ?? null,
    ghost_mode: (raw.ghost_mode as boolean | null) ?? null,
    profile_inactive: raw.profile_inactive === true,
    block_relation:
      raw.block_relation === "they_blocked_you" || raw.block_relation === "you_blocked_them"
        ? raw.block_relation
        : raw.blockRelation === "they_blocked_you" || raw.blockRelation === "you_blocked_them"
          ? (raw.blockRelation as "they_blocked_you" | "you_blocked_them")
          : null,
  };
}

export async function fetchProfileForViewer(username: string): Promise<{
  profile: PublicProfileRow | null;
  error: string | null;
}> {
  const un = username.trim();
  if (!un) return { profile: null, error: "Invalid username" };

  const { data, error } = await supabase.rpc("get_profile_for_viewer", { p_username: un });
  if (error) return { profile: null, error: error.message };
  const profile = profileFromRpc(data);
  if (!profile?.id) return { profile: null, error: "not_found" };
  return { profile, error: null };
}

export type FriendRequestStatus = "none" | "incoming" | "outgoing" | "friends";

export async function fetchFriendRequestStatus(
  meId: string,
  otherId: string
): Promise<FriendRequestStatus> {
  const { data } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`
    );

  for (const row of data ?? []) {
    if (row.status === "accepted") return "friends";
    if (row.status === "pending") {
      if (row.requester_id === meId) return "outgoing";
      return "incoming";
    }
  }
  return "none";
}

export async function fetchProfileSharesForUser(
  ownerId: string,
  viewerId: string | null
): Promise<{ shares: ProfileShareRow[]; count: number; canView: boolean; error: string | null }> {
  const canView = await viewerCanSeeOwnerPosts(viewerId, ownerId);
  if (!canView) return { shares: [], count: 0, canView: false, error: null };

  const { data, error } = await supabase
    .from("stories")
    .select("id, image_url, created_at, is_share, share_visible, share_hidden")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return { shares: [], count: 0, canView: true, error: error.message };

  const shares: ProfileShareRow[] = (data ?? [])
    .filter((s) => {
      if (!isStoryRowShareFlag(s.is_share)) return false;
      if (s.share_hidden) return false;
      return Boolean((s.image_url ?? "").trim());
    })
    .map((s) => ({
      id: s.id as string,
      image_url: (s.image_url ?? "") as string,
      created_at: (s.created_at ?? null) as string | null,
    }));

  return { shares, count: shares.length, canView: true, error: null };
}

export async function unfriendUser(meId: string, themId: string): Promise<boolean> {
  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .or(
      `and(requester_id.eq.${meId},addressee_id.eq.${themId}),and(requester_id.eq.${themId},addressee_id.eq.${meId})`
    );
  if (!error) {
    invalidateSocialGraph(meId);
    invalidateSocialGraph(themId);
  }
  return !error;
}

export { blockUser, unblockUser } from "./blockActions";
