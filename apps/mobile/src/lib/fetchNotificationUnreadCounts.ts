import { supabase } from "./supabase/client";

/** PWA hub heart — unread activity excluding DMs. */
export async function fetchHubActivityUnreadCount(meId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", meId)
    .eq("read", false)
    .neq("type", "message");

  if (error) {
    console.warn("fetchHubActivityUnreadCount:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** PWA `AppShell` chat tab badge — unread `message` notification rows. */
export async function fetchChatMessageUnreadCount(meId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", meId)
    .eq("read", false)
    .eq("type", "message");

  if (error) {
    console.warn("fetchChatMessageUnreadCount:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function fetchNotificationUnreadCounts(meId: string): Promise<{
  hubActivityUnread: number;
  chatMessageUnread: number;
}> {
  const [hubActivityUnread, chatMessageUnread] = await Promise.all([
    fetchHubActivityUnreadCount(meId),
    fetchChatMessageUnreadCount(meId),
  ]);
  return { hubActivityUnread, chatMessageUnread };
}
