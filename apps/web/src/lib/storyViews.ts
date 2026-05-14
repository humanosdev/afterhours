import type { SupabaseClient } from "@supabase/supabase-js";

/** Hub / profile listen to merge viewed state without refetching the full set. */
export const STORY_VIEWED_EVENT = "ah-story-viewed";

const CHUNK = 90;

export async function fetchViewedStoryIds(
  supabase: SupabaseClient,
  viewerId: string,
  storyIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!viewerId || storyIds.length === 0) return out;
  const unique = Array.from(new Set(storyIds.filter(Boolean)));
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", viewerId)
      .in("story_id", slice);
    if (error) {
      console.error("story_views select:", error);
      continue;
    }
    for (const row of data ?? []) {
      const sid = (row as { story_id?: string }).story_id;
      if (sid) out.add(sid);
    }
  }
  return out;
}

export async function recordStoryView(
  supabase: SupabaseClient,
  viewerId: string,
  storyId: string
): Promise<boolean> {
  if (!viewerId || !storyId) return false;
  const viewed_at = new Date().toISOString();
  const { error } = await supabase.from("story_views").upsert(
    { viewer_id: viewerId, story_id: storyId, viewed_at },
    { onConflict: "viewer_id,story_id" }
  );
  if (error) {
    console.error("story_views upsert:", error);
    return false;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(STORY_VIEWED_EVENT, { detail: { storyId } })
    );
  }
  return true;
}
