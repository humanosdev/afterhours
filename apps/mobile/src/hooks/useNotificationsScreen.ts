import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  FOREGROUND_UNREAD_POLL_MS,
  resolveRealtimePollFallbackMs,
} from "../lib/backgroundReadPolicy";
import { enrichNotificationRows } from "../lib/enrichNotifications";
import { fetchNotificationFeed } from "../lib/fetchNotificationFeed";
import { fetchPendingFriendRequests, type PendingFriendRequest } from "../lib/fetchPendingFriendRequests";
import { groupNotificationItems } from "../lib/groupNotifications";
import {
  deleteNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  notificationRowIds,
} from "../lib/notificationMutations";
import {
  subscribeFriendRequestsInbox,
  subscribeNotificationFeed,
} from "../lib/notificationsRealtime";
import {
  acceptIncomingFriendRequest,
  denyIncomingFriendRequest,
} from "../lib/respondIncomingFriendRequest";
import { navigateStoryEngagementNotification } from "../lib/notificationStoryEngagement";
import { subscribeNotificationFeedRefresh } from "../lib/notificationFeedRefresh";
import { useCreateComposer } from "../providers/CreateComposerProvider";
import { useNotificationDeliveryOptional } from "../providers/NotificationDeliveryProvider";
import { supabase } from "../lib/supabase/client";
import { useRealtimeChannelHealth } from "./useRealtimeChannelHealth";
import type { NotificationRow, NotificationWithMeta } from "../types/notification";

export function useNotificationsScreen(meId: string | undefined) {
  const router = useRouter();
  const { openShareComments, openStoryViewer } = useCreateComposer();
  const delivery = useNotificationDeliveryOptional();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationWithMeta[]>([]);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<PendingFriendRequest[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const { realtimeHealthy, onChannelStatus } = useRealtimeChannelHealth();

  const loadFeed = useCallback(async (uid: string) => {
    const { items: rows, error } = await fetchNotificationFeed(uid);
    setItems(rows);
    setFeedError(error);
  }, []);

  const loadRequests = useCallback(async (uid: string) => {
    const { rows, error } = await fetchPendingFriendRequests(uid);
    setFriendRequests(rows);
    setRequestsError(error);
  }, []);

  const reload = useCallback(async () => {
    if (!meId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    await Promise.all([loadFeed(meId), loadRequests(meId)]);
    setLoading(false);
  }, [meId, loadFeed, loadRequests]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!meId) return;
    return subscribeNotificationFeedRefresh(() => {
      void loadFeed(meId);
    });
  }, [meId, loadFeed]);

  useEffect(() => {
    if (!meId) return;
    const unsubs = [
      subscribeFriendRequestsInbox(supabase, meId, () => {
        void loadRequests(meId);
      }),
      subscribeNotificationFeed(supabase, meId, async (payload) => {
        if (payload.eventType === "DELETE" && payload.oldId) {
          setItems((prev) => prev.filter((x) => x.id !== payload.oldId));
          return;
        }
        const row = payload.row;
        if (!row) return;

        if (payload.eventType === "UPDATE") {
          setItems((prev) =>
            prev.map((x) =>
              x.id === row.id
                ? {
                    ...x,
                    read: row.read,
                    message_preview: row.message_preview ?? x.message_preview,
                  }
                : x
            )
          );
          return;
        }

        if (payload.eventType === "INSERT") {
          const [enriched] = await enrichNotificationRows([row as NotificationRow], meId);
          setItems((prev) => {
            if (prev.some((x) => x.id === enriched.id)) return prev;
            return [enriched, ...prev].slice(0, 200);
          });
          if (row.type === "friend_request_received") {
            void loadRequests(meId);
          }
        }
      }, onChannelStatus),
    ];
    return () => {
      for (const u of unsubs) u();
    };
  }, [meId, loadRequests, onChannelStatus]);

  useEffect(() => {
    if (!meId) return;
    const pollMs = resolveRealtimePollFallbackMs(realtimeHealthy, FOREGROUND_UNREAD_POLL_MS);
    if (pollMs == null) return;
    const poll = () => void loadFeed(meId);
    poll();
    const id = setInterval(poll, pollMs);
    return () => clearInterval(id);
  }, [meId, loadFeed, realtimeHealthy]);

  const groupedItems = useMemo(() => groupNotificationItems(items), [items]);

  const markReadLocal = useCallback((ids: string[]) => {
    setItems((prev) =>
      prev.map((row) => (ids.includes(row.id) ? { ...row, read: true } : row))
    );
  }, []);

  const markAllReadLocal = useCallback(() => {
    setItems((prev) => prev.map((row) => ({ ...row, read: true })));
  }, []);

  const markInboxReadOnFocus = useCallback(async () => {
    if (!meId) return;
    await markAllNotificationsRead(meId);
    markAllReadLocal();
    await delivery?.refreshUnreadCounts();
  }, [delivery, markAllReadLocal, meId]);

  useFocusEffect(
    useCallback(() => {
      if (!meId) return;
      void markInboxReadOnFocus();
    }, [meId, markInboxReadOnFocus])
  );

  const navigateForNotification = useCallback(
    async (n: NotificationWithMeta) => {
      if (!meId) return;

      if (
        n.type === "story_like" ||
        n.type === "story_comment" ||
        n.type === "friend_story"
      ) {
        await navigateStoryEngagementNotification({
          n,
          meId,
          router,
          openShareComments,
          openStoryViewer,
        });
        return;
      }

      if (n.type === "friend_joined_venue" && n.venue_id) {
        router.push(`/map?venueId=${encodeURIComponent(n.venue_id)}`);
        return;
      }
      if (
        n.type === "friend_online" ||
        n.type === "friend_nearby" ||
        n.type === "friends_active_bundle"
      ) {
        router.push("/map");
        return;
      }
      if (n.type === "venue_popping" && n.venue_id) {
        router.push(`/map?venueId=${encodeURIComponent(n.venue_id)}`);
        return;
      }
      const username = n.actor_username?.trim();
      if (
        (n.type === "friend_request_accepted" || n.type === "friend_request_received") &&
        username
      ) {
        router.push(`/u/${encodeURIComponent(username)}`);
      }
    },
    [meId, router, openShareComments, openStoryViewer]
  );

  const navigateToNotification = useCallback(
    (n: NotificationWithMeta) => {
      void navigateForNotification(n);
    },
    [navigateForNotification]
  );

  /** Legacy: mark on tap (kept for callers that still need explicit mark + navigate). */
  const markReadAndNavigate = useCallback(
    async (n: NotificationWithMeta) => {
      const ids = notificationRowIds(n);
      const needsMark = n.grouped_row_ids?.length
        ? items.some((row) => n.grouped_row_ids?.includes(row.id) && !row.read)
        : !n.read;

      if (needsMark) {
        await markNotificationsRead(ids);
        markReadLocal(ids);
        await delivery?.refreshUnreadCounts();
      }
      await navigateForNotification(n);
    },
    [delivery, items, markReadLocal, navigateForNotification]
  );

  const deleteNotification = useCallback(
    async (n: NotificationWithMeta) => {
      if (!meId) return;
      const ids = notificationRowIds(n);
      const ok = await deleteNotifications(meId, ids);
      if (ok) {
        setItems((prev) => prev.filter((x) => !ids.includes(x.id)));
        await delivery?.refreshUnreadCounts();
      }
    },
    [delivery, meId]
  );

  const acceptRequest = useCallback(
    async (requestId: string, requesterId: string) => {
      if (!meId) return;
      setRequestBusyId(requestId);
      await acceptIncomingFriendRequest(meId, requestId, requesterId);
      await loadRequests(meId);
      setRequestBusyId(null);
    },
    [meId, loadRequests]
  );

  const denyRequest = useCallback(
    async (requestId: string) => {
      setRequestBusyId(requestId);
      await denyIncomingFriendRequest(requestId);
      if (meId) await loadRequests(meId);
      setRequestBusyId(null);
    },
    [meId, loadRequests]
  );

  return {
    loading,
    groupedItems,
    feedError,
    friendRequests,
    requestsError,
    requestBusyId,
    reload,
    markInboxReadOnFocus,
    navigateToNotification,
    markReadAndNavigate,
    deleteNotification,
    acceptRequest,
    denyRequest,
  };
}
