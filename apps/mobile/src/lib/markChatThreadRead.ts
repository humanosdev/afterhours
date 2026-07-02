import { emitChatSeenUpdated } from "./chatSeenEvents";
import { supabase } from "./supabase/client";

/** PWA thread open — mark message notifications + inbound messages seen. */
export async function markChatThreadRead(meId: string, chatId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_user_id", meId)
    .eq("type", "message")
    .eq("chat_id", chatId)
    .eq("read", false);

  const { error } = await supabase
    .from("messages")
    .update({ seen: true })
    .eq("chat_id", chatId)
    .eq("receiver_id", meId)
    .eq("seen", false);

  if (!error) {
    emitChatSeenUpdated(chatId);
  }
}

export async function markMessageSeen(messageId: string, chatId: string): Promise<void> {
  const { error } = await supabase.from("messages").update({ seen: true }).eq("id", messageId);
  if (!error) {
    emitChatSeenUpdated(chatId);
  }
}
