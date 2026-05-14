import type { SupabaseClient } from "@supabase/supabase-js";

export type StoryCommentProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

/**
 * Hydrate commenter profiles for a story. Uses SECURITY DEFINER RPC when available
 * so private accounts still show avatars next to their comments; falls back to RLS-bound `profiles` for any missing ids.
 */
export async function fetchProfilesForStoryCommenters(
  supabase: SupabaseClient,
  storyId: string,
  commenterIds: string[]
): Promise<Record<string, StoryCommentProfile>> {
  const unique = Array.from(new Set(commenterIds.filter(Boolean)));
  const byId: Record<string, StoryCommentProfile> = {};
  if (!unique.length) return byId;

  const { data: rpcRows, error: rpcError } = await supabase.rpc("profiles_for_story_commenters", {
    p_story_id: storyId,
  });
  if (rpcError) {
    console.warn("profiles_for_story_commenters:", rpcError.message);
  } else {
    for (const row of (rpcRows ?? []) as Array<{ id: string; username?: string | null; avatar_url?: string | null }>) {
      const uid = row.id;
      byId[uid] = {
        id: uid,
        username: row.username ?? null,
        avatar_url: (row.avatar_url ?? "").trim() || null,
      };
    }
  }

  const missing = unique.filter((uid) => !byId[uid]);
  if (missing.length) {
    const { data: prof, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", missing);
    if (profileError) console.warn("profiles fallback for commenters:", profileError.message);
    for (const p of prof ?? []) {
      const row = p as { id: string; username?: string | null; avatar_url?: string | null };
      byId[row.id] = {
        id: row.id,
        username: row.username ?? null,
        avatar_url: (row.avatar_url ?? "").trim() || null,
      };
    }
  }

  return byId;
}
