import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationRow } from "../types/notification";

export function subscribeFriendRequestsInbox(
  supabase: SupabaseClient,
  meId: string,
  onChange: () => void
): () => void {
  const channel = supabase
    .channel(`notifications-friend-requests:${meId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "friend_requests",
        filter: `addressee_id=eq.${meId}`,
      },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export type NotificationRealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  row: NotificationRow | null;
  oldId?: string;
};

/** All notification rows for recipient — hub badge, chat badge, message toasts. */
export function subscribeNotificationInbox(
  supabase: SupabaseClient,
  meId: string,
  onPayload: (payload: NotificationRealtimePayload) => void
): () => void {
  const channel = supabase
    .channel(`notification-inbox:${meId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `recipient_user_id=eq.${meId}`,
      },
      (payload) => {
        const eventType = payload.eventType as NotificationRealtimePayload["eventType"];
        if (eventType === "DELETE") {
          const oldRow = payload.old as { id?: string } | null;
          onPayload({ eventType, row: null, oldId: oldRow?.id });
          return;
        }
        const row = payload.new as NotificationRow | null;
        onPayload({ eventType, row });
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeNotificationFeed(
  supabase: SupabaseClient,
  meId: string,
  onPayload: (payload: NotificationRealtimePayload) => void,
  onChannelStatus?: (status: string) => void
): () => void {
  const channel = supabase
    .channel(`notifications-page:${meId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `recipient_user_id=eq.${meId}`,
      },
      (payload) => {
        const eventType = payload.eventType as NotificationRealtimePayload["eventType"];
        if (eventType === "DELETE") {
          const oldRow = payload.old as { id?: string } | null;
          onPayload({ eventType, row: null, oldId: oldRow?.id });
          return;
        }
        const row = payload.new as NotificationRow | null;
        if (!row || row.type === "message") return;
        onPayload({ eventType, row });
      }
    )
    .subscribe((status) => {
      onChannelStatus?.(status);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
