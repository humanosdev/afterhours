import { supabase } from "./supabase/client";
import type { ReportTargetType } from "./contentReports";

export type ModerationQueueStory = {
  kind: "story";
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  is_share: boolean;
  moderation_status: string;
};

export type ModerationQueueComment = {
  kind: "comment";
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  created_at: string;
  moderation_status: string;
};

export type ModerationQueueItem = ModerationQueueStory | ModerationQueueComment;

export async function fetchAdminModerationQueue(): Promise<{
  items: ModerationQueueItem[];
  error: string | null;
}> {
  const [storiesRes, commentsRes] = await Promise.all([
    supabase
      .from("stories")
      .select("id, user_id, image_url, created_at, is_share, moderation_status")
      .eq("moderation_status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("story_comments")
      .select("id, story_id, user_id, content, created_at, moderation_status")
      .eq("moderation_status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (storiesRes.error && commentsRes.error) {
    return { items: [], error: storiesRes.error.message };
  }

  const items: ModerationQueueItem[] = [];

  for (const row of storiesRes.data ?? []) {
    const imageUrl = String(row.image_url ?? "").trim();
    if (!imageUrl) continue;
    items.push({
      kind: "story",
      id: row.id as string,
      user_id: row.user_id as string,
      image_url: imageUrl,
      created_at: row.created_at as string,
      is_share: !!row.is_share,
      moderation_status: String(row.moderation_status ?? "pending_review"),
    });
  }

  for (const row of commentsRes.data ?? []) {
    items.push({
      kind: "comment",
      id: row.id as string,
      story_id: row.story_id as string,
      user_id: row.user_id as string,
      content: String(row.content ?? ""),
      created_at: row.created_at as string,
      moderation_status: String(row.moderation_status ?? "pending_review"),
    });
  }

  items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { items, error: null };
}

export function moderationTargetType(item: ModerationQueueItem): ReportTargetType {
  return item.kind === "story" ? "story" : "comment";
}
