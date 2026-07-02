import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { ChatListMessageRow } from "./patchChatPreviewFromMessage";
import { removeSupabaseChannelsByName } from "./removeSupabaseChannel";

/**
 * PWA `chat-list:${meId}` — all message INSERT/UPDATE (list patches locally).
 */
export function subscribeChatListChanges(
  supabase: SupabaseClient,
  meId: string,
  opts: {
    onInsert: (row: ChatListMessageRow) => void;
    onUpdate: (row: ChatListMessageRow) => void;
    onChannelStatus?: (status: string) => void;
  }
): () => void {
  const channelName = `chat-list:${meId}`;
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  void (async () => {
    await removeSupabaseChannelsByName(supabase, channelName);
    if (cancelled) return;

    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as ChatListMessageRow;
          if (row?.chat_id) opts.onInsert(row);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as ChatListMessageRow;
          if (row?.chat_id) opts.onUpdate(row);
        }
      )
      .subscribe((status) => {
        opts.onChannelStatus?.(status);
      });
  })();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
    void removeSupabaseChannelsByName(supabase, channelName);
  };
}
