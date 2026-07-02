import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatThreadMessage } from "../types/chatThread";

export type ChatMessageRealtimeRow = ChatThreadMessage & { chat_id?: string; seen?: boolean | null };

/**
 * Postgres INSERT/UPDATE/DELETE on `messages` for one thread, plus broadcast unsend.
 * PWA `chat:${conversationId}` channel.
 */
export function subscribeChatThreadMessageEvents(
  supabase: SupabaseClient,
  opts: {
    chatId: string;
    onInsert: (row: ChatThreadMessage) => void;
    onUpdate?: (row: ChatThreadMessage) => void;
    onDelete?: (messageId: string) => void;
    onChannelStatus?: (status: string) => void;
  }
): () => void {
  const handleDelete = (messageId: string | undefined) => {
    if (messageId) opts.onDelete?.(messageId);
  };

  const mapRow = (row: ChatMessageRealtimeRow): ChatThreadMessage => ({
    id: row.id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    content: row.content,
    created_at: row.created_at,
    story_id: row.story_id ?? null,
    seen: row.seen === true,
  });

  const channel = supabase
    .channel(`chat:${opts.chatId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${opts.chatId}`,
      },
      (payload) => {
        const row = payload.new as ChatMessageRealtimeRow;
        if (!row?.id || !row.sender_id || !row.content) return;
        opts.onInsert(mapRow(row));
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${opts.chatId}`,
      },
      (payload) => {
        const row = payload.new as ChatMessageRealtimeRow;
        if (!row?.id || !row.sender_id) return;
        opts.onUpdate?.(mapRow(row));
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${opts.chatId}`,
      },
      (payload) => {
        const old = payload.old as { id?: string };
        handleDelete(old?.id);
      }
    )
    .on("broadcast", { event: "message_deleted" }, ({ payload }) => {
      const row = payload as { id?: string } | undefined;
      handleDelete(row?.id);
    })
    .subscribe((status) => {
      opts.onChannelStatus?.(status);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

/** @deprecated Use subscribeChatThreadMessageEvents */
export function subscribeChatThreadInserts(
  supabase: SupabaseClient,
  opts: {
    chatId: string;
    onInsert: (row: ChatThreadMessage) => void;
  }
): () => void {
  return subscribeChatThreadMessageEvents(supabase, opts);
}
