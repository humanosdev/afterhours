import { isStoryRowShareFlag } from "./hubFeedSemantics";
import { storyImageUrlFromRow } from "./storyMediaUrl";
import { supabase } from "./supabase/client";
import type { ChatStoryReplyAttachment, ChatThreadMessage } from "../types/chatThread";

const STORY_COLUMNS = "id, image_url, is_share" as const;

/** Attach story thumbnails for DM replies that reference `story_id`. */
export async function hydrateChatStoryReplies(
  messages: ChatThreadMessage[]
): Promise<ChatThreadMessage[]> {
  const storyIds = Array.from(
    new Set(messages.map((m) => m.story_id).filter((id): id is string => Boolean(id)))
  );
  if (storyIds.length === 0) return messages;

  const { data } = await supabase.from("stories").select(STORY_COLUMNS).in("id", storyIds);
  const byId = new Map<string, ChatStoryReplyAttachment>();
  for (const row of data ?? []) {
    const mediaUrl = storyImageUrlFromRow(row);
    if (!mediaUrl) continue;
    byId.set(row.id as string, {
      id: row.id as string,
      media_url: mediaUrl,
      is_share: isStoryRowShareFlag(row.is_share),
    });
  }

  return messages.map((m) => {
    if (!m.story_id) return m;
    return { ...m, story_attachment: byId.get(m.story_id) ?? null };
  });
}
