import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPresenceRow } from "../types/presence";

export type UserPresenceRealtimeRow = {
  user_id: string;
  lat?: number | null;
  lng?: number | null;
  venue_id?: string | null;
  zone_type?: string | null;
  venue_state?: string | null;
  entered_inner_at?: string | null;
  updated_at?: string | null;
};

/**
 * Postgres changes on `user_presence` (requires table on `supabase_realtime` publication).
 * Mirrors `apps/web/src/lib/userPresenceRealtime.ts`.
 */
export function subscribeUserPresenceChanges(
  supabase: SupabaseClient,
  opts: {
    channelName: string;
    onInsertOrUpdate: (row: UserPresenceRealtimeRow) => void;
    onDelete?: (userId: string) => void;
    onChannelStatus?: (status: string) => void;
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
    .subscribe((status) => {
      opts.onChannelStatus?.(status);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function mergePresenceRow(prev: UserPresenceRow[], row: UserPresenceRealtimeRow): UserPresenceRow[] {
  const lat = typeof row.lat === "number" ? row.lat : undefined;
  const lng = typeof row.lng === "number" ? row.lng : undefined;
  const i = prev.findIndex((x) => x.user_id === row.user_id);
  const prior = i >= 0 ? prev[i] : undefined;
  const zoneRaw = row.zone_type ?? prior?.zone_type;
  const merged: UserPresenceRow = {
    user_id: row.user_id,
    lat: lat ?? prior?.lat ?? 0,
    lng: lng ?? prior?.lng ?? 0,
    venue_id: (row.venue_id as string | null | undefined) ?? prior?.venue_id ?? null,
    zone_type:
      zoneRaw === "inner" || zoneRaw === "outer" || zoneRaw === "halo" ? zoneRaw : prior?.zone_type ?? null,
    venue_state: (row.venue_state as string | null | undefined) ?? prior?.venue_state ?? null,
    entered_inner_at:
      (row.entered_inner_at as string | null | undefined) ?? prior?.entered_inner_at ?? null,
    updated_at: (row.updated_at as string) || prior?.updated_at || new Date().toISOString(),
  };
  if (i >= 0) {
    const next = [...prev];
    next[i] = merged;
    return next;
  }
  return [...prev, merged];
}
