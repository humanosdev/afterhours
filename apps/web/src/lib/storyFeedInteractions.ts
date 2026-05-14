import type { SupabaseClient } from "@supabase/supabase-js";

export type ShareInteractionStats = {
  likesCount: number;
  commentsCount: number;
  liked: boolean;
};

/** Batch-load like counts, comment counts, and whether the current user liked each story. */
export async function fetchShareInteractionStatsByStoryId(
  supabase: SupabaseClient,
  storyIds: string[],
  meId: string | null
): Promise<Record<string, ShareInteractionStats>> {
  const out: Record<string, ShareInteractionStats> = {};
  for (const id of storyIds) {
    out[id] = { likesCount: 0, commentsCount: 0, liked: false };
  }
  if (!storyIds.length) return out;

  const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
    supabase.from("story_likes").select("story_id,user_id").in("story_id", storyIds),
    supabase.from("story_comments").select("story_id").in("story_id", storyIds),
  ]);

  for (const row of likeRows ?? []) {
    const sid = row.story_id as string;
    if (!out[sid]) continue;
    out[sid].likesCount += 1;
    if (meId && row.user_id === meId) out[sid].liked = true;
  }

  for (const row of commentRows ?? []) {
    const sid = row.story_id as string;
    if (!out[sid]) continue;
    out[sid].commentsCount += 1;
  }

  return out;
}
