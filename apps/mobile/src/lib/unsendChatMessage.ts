import { broadcastChatMessageDeleted } from "./broadcastChatMessageDeleted";
import { bumpChatListRefresh } from "./chatListRefresh";
import { supabase } from "./supabase/client";

export type UnsendChatMessageResult = { ok: true } | { ok: false; error: string };

/** Delete a sent message for both participants (sender only — RLS). */
export async function unsendChatMessage(params: {
  chatId: string;
  meId: string;
  messageId: string;
}): Promise<UnsendChatMessageResult> {
  const { chatId, meId, messageId } = params;

  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("chat_id", chatId)
    .eq("sender_id", meId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  void broadcastChatMessageDeleted(chatId, messageId);

  const { data: latest } = await supabase
    .from("messages")
    .select("content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const preview =
    typeof latest?.content === "string" && latest.content.trim()
      ? latest.content.trim().slice(0, 140)
      : "";

  const { error: chatError } = await supabase
    .from("chats")
    .update({
      last_message: preview,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId);

  if (chatError) {
    console.warn("unsendChatMessage chat preview:", chatError.message);
  }

  bumpChatListRefresh();
  return { ok: true };
}
