import { enrichNotificationRows } from "./enrichNotifications";
import { supabase } from "./supabase/client";
import type { NotificationRow, NotificationWithMeta } from "../types/notification";

const NOTIFICATION_COLUMNS =
  "id, recipient_user_id, actor_user_id, type, venue_id, story_id, chat_id, message_preview, created_at, read" as const;

export async function fetchNotificationFeed(meId: string): Promise<{
  items: NotificationWithMeta[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("recipient_user_id", meId)
    .neq("type", "message")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return { items: [], error: error.message };
  }

  const enriched = await enrichNotificationRows((data ?? []) as NotificationRow[], meId);
  return { items: enriched, error: null };
}
