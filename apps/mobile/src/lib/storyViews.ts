import type { SupabaseClient } from "@supabase/supabase-js";
import { emitStoryViewed } from "./storyViewEvents";
import { supabase } from "./supabase/client";

const CHUNK = 90;

export async function fetchViewedStoryIds(
  client: SupabaseClient,
  viewerId: string,
  storyIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!viewerId || storyIds.length === 0) return out;
  const unique = Array.from(new Set(storyIds.filter(Boolean)));
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data, error } = await client
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", viewerId)
      .in("story_id", slice);
    if (error) continue;
    for (const row of data ?? []) {
      const sid = (row as { story_id?: string }).story_id;
      if (sid) out.add(sid);
    }
  }
  return out;
}

export async function recordStoryView(
  client: SupabaseClient,
  viewerId: string,
  storyId: string
): Promise<boolean> {
  if (!viewerId || !storyId) return false;
  const viewed_at = new Date().toISOString();
  const { error } = await client.from("story_views").upsert(
    { viewer_id: viewerId, story_id: storyId, viewed_at },
    { onConflict: "viewer_id,story_id" }
  );
  if (!error) emitStoryViewed(storyId);
  return !error;
}

export async function recordStoryViewDefault(viewerId: string, storyId: string) {
  return recordStoryView(supabase, viewerId, storyId);
}
