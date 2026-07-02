import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { removeSupabaseChannelsByName } from "../lib/removeSupabaseChannel";
import { supabase } from "../lib/supabase/client";

/**
 * PWA `hub-stories-feed-rt` — debounced refresh when friends (or self) mutate `stories`.
 * Caller should bump hub feed epoch / refetch lists.
 */
export function useHubStoriesRealtime(
  userId: string | undefined,
  friendIds: string[],
  onRefresh: () => void
) {
  const friendKey = friendIds.slice().sort().join(",");
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!userId) return;

    const allowed = new Set<string>([userId, ...friendIds]);
    let bounce: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const bumpFeed = () => {
      if (bounce) clearTimeout(bounce);
      bounce = setTimeout(() => {
        bounce = null;
        onRefreshRef.current();
      }, 120);
    };

    const isAllowedRow = (row: { user_id?: string } | null | undefined) =>
      Boolean(row?.user_id && allowed.has(row.user_id));

    const channelName = `hub-stories-feed-rt:${userId}`;

    void (async () => {
      await removeSupabaseChannelsByName(supabase, channelName);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "stories" },
          (payload) => {
            if (!isAllowedRow(payload.new as { user_id?: string } | null)) return;
            bumpFeed();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "stories" },
          (payload) => {
            const row = (payload.new ?? payload.old) as { user_id?: string } | null;
            if (!isAllowedRow(row)) return;
            bumpFeed();
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "stories" },
          (payload) => {
            if (!isAllowedRow(payload.old as { user_id?: string } | null)) return;
            bumpFeed();
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (bounce) clearTimeout(bounce);
      if (channel) void supabase.removeChannel(channel);
      void removeSupabaseChannelsByName(supabase, channelName);
    };
  }, [userId, friendKey]);
}
