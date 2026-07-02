import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  getCachedAcceptedFriends,
  setCachedAcceptedFriends,
} from "../lib/acceptedFriendsCache";
import { fetchAcceptedFriends } from "../lib/fetchAcceptedFriends";
import { subscribeSocialGraphChanged } from "../lib/socialGraphSync";
import { supabase } from "../lib/supabase/client";
import type { AcceptedFriendPublic } from "../types/friend";

const SOCIAL_GRAPH_RT_DEBOUNCE_MS = 450;

export function useAcceptedFriends(
  userId: string | undefined,
  opts?: { reloadOnFocus?: boolean }
) {
  const reloadOnFocus = opts?.reloadOnFocus ?? true;
  const [friends, setFriends] = useState<AcceptedFriendPublic[]>(() =>
    userId ? (getCachedAcceptedFriends(userId) ?? []) : []
  );
  const [loading, setLoading] = useState(
    () => Boolean(userId) && getCachedAcceptedFriends(userId ?? "") == null
  );
  const [error, setError] = useState<string | null>(null);
  const reloadSeq = useRef(0);

  const reloadFriends = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!userId) {
        setFriends([]);
        setLoading(false);
        setError(null);
        return;
      }
      const seq = ++reloadSeq.current;
      if (!opts?.quiet) setLoading(true);
      setError(null);
      const { friends: next, error: nextError } = await fetchAcceptedFriends(userId);
      if (seq !== reloadSeq.current) return;
      setCachedAcceptedFriends(userId, next);
      setFriends(next);
      setError(nextError);
      setLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) {
      setFriends([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = getCachedAcceptedFriends(userId);
    if (cached) {
      setFriends(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    void reloadFriends({ quiet: cached != null });

    return subscribeSocialGraphChanged(() => {
      void reloadFriends({ quiet: true });
    });
  }, [userId, reloadFriends]);

  useFocusEffect(
    useCallback(() => {
      if (!reloadOnFocus || !userId) return;
      void reloadFriends({ quiet: true });
    }, [reloadOnFocus, userId, reloadFriends])
  );

  const reloadFriendsRef = useRef(reloadFriends);
  reloadFriendsRef.current = reloadFriends;

  /** Realtime — unique channel per hook instance (Profile + PresenceProvider both call this). */
  useEffect(() => {
    if (!userId) return;

    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = null;
        void reloadFriendsRef.current({ quiet: true });
      }, SOCIAL_GRAPH_RT_DEBOUNCE_MS);
    };

    const channelName = `native-social-graph-${userId}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName);
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        scheduleReload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks" },
        scheduleReload
      )
      .subscribe();

    return () => {
      if (debounceId) clearTimeout(debounceId);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { friends, loading, error, reloadFriends };
}
