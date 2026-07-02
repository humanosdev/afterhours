import { supabase } from "./supabase/client";
import type { NotificationWithMeta } from "../types/notification";

export function notificationRowIds(n: NotificationWithMeta): string[] {
  return n.grouped_row_ids?.length ? n.grouped_row_ids : [n.id];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await supabase.from("notifications").update({ read: true }).in("id", ids);
}

/** PWA parity — opening the notifications screen marks the inbox as seen. */
export async function markAllNotificationsRead(meId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_user_id", meId)
    .eq("read", false);

  if (error) {
    console.warn("markAllNotificationsRead:", error.message);
  }
}

/** Clears chat tab badge when opening a thread (PWA uses `message` notification rows). */
export async function markChatMessageNotificationsRead(
  meId: string,
  chatId: string
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_user_id", meId)
    .eq("type", "message")
    .eq("chat_id", chatId)
    .eq("read", false);
}

export async function deleteNotifications(meId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const { error } = await supabase
    .from("notifications")
    .delete()
    .in("id", ids)
    .eq("recipient_user_id", meId);
  return !error;
}
