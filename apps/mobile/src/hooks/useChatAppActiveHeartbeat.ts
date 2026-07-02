import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";

const CHAT_APP_ACTIVE_HEARTBEAT_MS = 15_000;

/** Phase 5.1 — foreground app signal for chat (separate from GPS presence). */
export function useChatAppActiveHeartbeat(userId: string | undefined, enabled: boolean): void {
  useEffect(() => {
    if (!userId || !enabled) return;

    const channel = supabase.channel(`chat-app-active:${userId}`, {
      config: { presence: { key: userId } },
    });

    const track = () => {
      void channel.track({ at: Date.now() });
    };

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") track();
    });

    const id = setInterval(track, CHAT_APP_ACTIVE_HEARTBEAT_MS);
    return () => {
      clearInterval(id);
      void supabase.removeChannel(channel);
    };
  }, [userId, enabled]);
}

/** True when peer has the app foreground (Realtime presence on chat-app-active channel). */
export function usePeerChatOnline(peerId: string | null | undefined): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!peerId) {
      setOnline(false);
      return;
    }

    const channel = supabase.channel(`chat-app-active:${peerId}`, {
      config: { presence: { key: peerId } },
    });

    const sync = () => {
      const state = channel.presenceState();
      const entries = Object.values(state).flat();
      setOnline(entries.length > 0);
    };

    channel.on("presence", { event: "sync" }, sync).subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [peerId]);

  return online;
}
