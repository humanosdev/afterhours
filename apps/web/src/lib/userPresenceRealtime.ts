import type { SupabaseClient } from "@supabase/supabase-js";

export type UserPresenceRealtimeRow = {
  user_id: string;
  lat?: number | null;
  lng?: number | null;
  venue_id?: string | null;
  updated_at?: string | null;
};

/**
 * Postgres changes on `user_presence` (requires table on `supabase_realtime` publication — see migration).
 * RLS still filters which rows the client receives.
 */
export function subscribeUserPresenceChanges(
  supabase: SupabaseClient,
  opts: {
    channelName: string;
    onInsertOrUpdate: (row: UserPresenceRealtimeRow) => void;
    onDelete?: (userId: string) => void;
  }
) {
  const channel = supabase
    .channel(opts.channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_presence" },
      (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
        if (payload.eventType === "DELETE") {
          const uid = payload.old?.user_id;
          if (typeof uid === "string") opts.onDelete?.(uid);
          return;
        }
        const row = payload.new as UserPresenceRealtimeRow | undefined;
        if (row?.user_id) opts.onInsertOrUpdate(row);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
