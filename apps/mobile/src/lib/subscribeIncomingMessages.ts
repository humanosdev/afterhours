import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { removeSupabaseChannelsByName } from "./removeSupabaseChannel";

export type IncomingMessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

/**
 * Reliable DM delivery when `notifications` realtime is unavailable.
 * PWA also listens on `notifications`; native uses messages INSERT as primary toast trigger.
 */
export function subscribeIncomingMessages(
  supabase: SupabaseClient,
  meId: string,
  onMessage: (row: IncomingMessageRow) => void
): () => void {
  const channelName = `incoming-messages:${meId}`;
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
          const row = payload.new as IncomingMessageRow | null;
          if (!row?.id || row.receiver_id !== meId || row.sender_id === meId) return;
          onMessage(row);
        }
      )
      .subscribe();
  })();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
    void removeSupabaseChannelsByName(supabase, channelName);
  };
}
