import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchGhostModeByUserIds, fetchUserPresenceRows } from "../lib/fetchUserPresence";
import { fetchBlockedUserIds } from "../lib/fetchBlockedUserIds";
import {
  canShowPresenceUser,
  filterPresenceForSocialGraph,
} from "../lib/filterPresenceForSocialGraph";
import {
  getCachedPresencePreview,
  setCachedPresencePreview,
} from "../lib/presencePreviewCache";
import { subscribeSocialGraphChanged } from "../lib/socialGraphSync";
import type { PresenceRefreshBoost } from "../lib/mapPresenceRefresh";
import { resolvePresenceRefreshPolicy, BACKGROUND_PRESENCE_POLL_MS, REALTIME_HEALTHY_GRACE_MS } from "../lib/backgroundReadPolicy";
import { mergePresenceRow, subscribeUserPresenceChanges } from "../lib/userPresenceRealtime";
import { subscribePresenceResumeRequest } from "../lib/presenceResumeBus";
import { supabase } from "../lib/supabase/client";
import type { UserPresenceRow } from "../types/presence";

function blockedIdsKey(blocked: Set<string>): string {
  return [...blocked].sort().join(",");
}

export function useUserPresenceState(
  enabled: boolean,
  friendIds: string[],
  meId: string | undefined,
  refreshBoost: PresenceRefreshBoost | null,
  appForeground: boolean
) {
  const friendIdsKey = useMemo(
    () => friendIds.slice().sort().join(","),
    [friendIds]
  );
  const [presence, setPresence] = useState<UserPresenceRow[]>(
    () => getCachedPresencePreview() ?? []
  );
  const [presenceLoading, setPresenceLoading] = useState(
    () => enabled && getCachedPresencePreview() == null
  );
  const [presenceInitialSyncDone, setPresenceInitialSyncDone] = useState(false);
  const presenceInitialSyncDoneRef = useRef(false);
  const [ghostByUserId, setGhostByUserId] = useState<Record<string, boolean>>({});
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(() => new Set());
  const [presenceClock, setPresenceClock] = useState(0);
  const [realtimeHealthy, setRealtimeHealthy] = useState(false);
  const friendIdSet = useMemo(() => new Set(friendIds), [friendIdsKey]);

  const friendIdSetRef = useRef(friendIdSet);
  const blockedRef = useRef(blockedUserIds);
  const meIdRef = useRef(meId);
  const appForegroundRef = useRef(appForeground);
  const lastBackgroundReloadRef = useRef(0);
  const realtimeSubscribedAtRef = useRef<number | null>(null);
  const realtimeChannelStatusRef = useRef<string>("INIT");
  friendIdSetRef.current = friendIdSet;
  blockedRef.current = blockedUserIds;
  meIdRef.current = meId;
  appForegroundRef.current = appForeground;

  const filterRows = useCallback((rows: UserPresenceRow[]) => {
    return filterPresenceForSocialGraph(
      rows,
      meIdRef.current ?? null,
      friendIdSetRef.current,
      blockedRef.current
    );
  }, []);

  const loadBlocked = useCallback(async () => {
    if (!meIdRef.current) {
      setBlockedUserIds(new Set());
      return;
    }
    const hidden = await fetchBlockedUserIds(meIdRef.current);
    setBlockedUserIds(hidden);
    setPresence((prev) => filterRows(prev));
  }, [filterRows]);

  const loadInFlightRef = useRef(false);

  const syncRealtimeHealthy = useCallback(() => {
    const subscribedAt = realtimeSubscribedAtRef.current;
    const healthy =
      realtimeChannelStatusRef.current === "SUBSCRIBED" &&
      subscribedAt != null &&
      Date.now() - subscribedAt >= REALTIME_HEALTHY_GRACE_MS;
    setRealtimeHealthy(healthy);
  }, []);

  const loadPresence = useCallback(async (opts?: { quiet?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (!opts?.quiet) setPresenceLoading(true);
    try {
      const { presence: rows, error } = await fetchUserPresenceRows();
      if (!error) {
        const filtered = filterRows(rows);
        setCachedPresencePreview(filtered);
        setPresence(filtered);
      } else if (__DEV__ && !opts?.quiet) {
        console.warn("[presence] load failed:", error);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("[presence] load threw:", error);
      }
    } finally {
      loadInFlightRef.current = false;
      if (!opts?.quiet) setPresenceLoading(false);
      if (!presenceInitialSyncDoneRef.current) {
        presenceInitialSyncDoneRef.current = true;
        setPresenceInitialSyncDone(true);
      }
    }
  }, [filterRows]);

  useEffect(() => {
    if (!enabled || !meId) {
      setBlockedUserIds(new Set());
      return;
    }
    void loadBlocked();
    return subscribeSocialGraphChanged(() => {
      void loadBlocked();
    });
  }, [enabled, meId, loadBlocked]);

  useEffect(() => {
    if (!enabled) {
      setPresence([]);
      setPresenceLoading(false);
      setGhostByUserId({});
      presenceInitialSyncDoneRef.current = false;
      setPresenceInitialSyncDone(false);
      return;
    }

    presenceInitialSyncDoneRef.current = false;
    setPresenceInitialSyncDone(false);

    const cached = getCachedPresencePreview();
    if (cached) {
      setPresence(filterRows(cached));
      setPresenceLoading(false);
    }

    let mounted = true;
    void loadPresence({ quiet: cached != null });

    const unsub = subscribeUserPresenceChanges(supabase, {
      channelName: "native-user-presence",
      onChannelStatus: (status) => {
        if (!mounted) return;
        realtimeChannelStatusRef.current = status;
        if (status === "SUBSCRIBED") {
          if (realtimeSubscribedAtRef.current == null) {
            realtimeSubscribedAtRef.current = Date.now();
          }
        } else {
          realtimeSubscribedAtRef.current = null;
        }
        syncRealtimeHealthy();
      },
      onInsertOrUpdate: (row) => {
        if (!mounted) return;
        const uid = row.user_id;
        if (
          !canShowPresenceUser(
            uid,
            meIdRef.current ?? null,
            friendIdSetRef.current,
            blockedRef.current
          )
        ) {
          setPresence((prev) => {
            if (!prev.some((x) => x.user_id === uid)) return prev;
            const next = prev.filter((x) => x.user_id !== uid);
            setCachedPresencePreview(next);
            return next;
          });
          return;
        }
        setPresence((prev) => {
          const next = mergePresenceRow(prev, row);
          setCachedPresencePreview(next);
          return next;
        });
        if (!appForegroundRef.current) {
          const now = Date.now();
          if (now - lastBackgroundReloadRef.current >= BACKGROUND_PRESENCE_POLL_MS) {
            lastBackgroundReloadRef.current = now;
            void loadPresence({ quiet: true });
          }
        }
      },
      onDelete: (uid) => {
        if (!mounted) return;
        setPresence((prev) => {
          const next = prev.filter((x) => x.user_id !== uid);
          setCachedPresencePreview(next);
          return next;
        });
      },
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [enabled, loadPresence, filterRows, syncRealtimeHealthy]);

  useEffect(() => {
    if (!enabled) {
      setRealtimeHealthy(false);
      return;
    }

    syncRealtimeHealthy();
    const id = setInterval(syncRealtimeHealthy, 5_000);
    return () => clearInterval(id);
  }, [enabled, syncRealtimeHealthy]);

  useEffect(() => {
    if (!enabled) return;

    const { pollMs, clockMs } = resolvePresenceRefreshPolicy({
      appForeground,
      mapBoost: refreshBoost,
      realtimeHealthy,
    });

    const pollId = setInterval(() => {
      void loadPresence({ quiet: true });
    }, pollMs);

    const clockId = setInterval(() => {
      setPresenceClock((n) => n + 1);
    }, clockMs);

    return () => {
      clearInterval(pollId);
      clearInterval(clockId);
    };
  }, [enabled, loadPresence, refreshBoost, appForeground, realtimeHealthy]);

  useEffect(() => {
    if (!enabled) return;
    return subscribePresenceResumeRequest(() => {
      void loadPresence({ quiet: true });
    });
  }, [enabled, loadPresence]);

  useEffect(() => {
    if (!enabled || !friendIdsKey) {
      setGhostByUserId({});
      return;
    }
    let cancelled = false;
    void fetchGhostModeByUserIds(friendIds).then((map) => {
      if (!cancelled) setGhostByUserId(map);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, friendIdsKey, friendIds]);

  /** Re-filter when social graph inputs change — without re-subscribing realtime. */
  useEffect(() => {
    if (!enabled) return;
    setPresence((prev) => filterRows(prev));
  }, [enabled, friendIdsKey, blockedIdsKey(blockedUserIds), filterRows]);

  const reloadPresence = useCallback(
    (opts?: { quiet?: boolean }) => loadPresence({ quiet: opts?.quiet ?? false }),
    [loadPresence]
  );

  return useMemo(
    () => ({
      presence,
      presenceLoading,
      presenceInitialSyncDone,
      ghostByUserId,
      blockedUserIds,
      friendIdSet,
      presenceClock,
      reloadPresence,
    }),
    [
      presence,
      presenceLoading,
      presenceInitialSyncDone,
      ghostByUserId,
      blockedUserIds,
      friendIdSet,
      presenceClock,
      reloadPresence,
    ]
  );
}
