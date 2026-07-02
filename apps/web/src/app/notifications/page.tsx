"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { formatRelativeTime } from "@/lib/time";
import type { NotificationWithMeta } from "../../../types/notifications";
import NotificationListSkeleton from "@/components/skeletons/NotificationListSkeleton";
import { AppSubpageHeader, navigateBack } from "@/components/AppSubpageHeader";
import { Trash2 } from "lucide-react";
import {
  decodeFriendRequestNotificationPreview,
} from "@/lib/notifications";
import { groupNotificationFeedItems } from "@/lib/groupNotificationFeed";
import {
  isGroupedStoryEngagementFeedRow,
  isStoryEngagementGroupType,
  storyEngagementCommentLine,
  storyEngagementGroupedSubtext,
  storyEngagementLikeLine,
  storyEngagementSurfaceFromShareFlag,
} from "@intencity/shared";
import { isStoryRowShareFlag } from "@/lib/storyRowShare";
import { profileHref } from "@/lib/profileRoutes";
import { getPairBlockStatus, getBlockDirections, idsBlockedWithMe } from "@/lib/pairBlockStatus";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
  APP_PAGE_TOP_PADDING_CLASS,
  APP_TAB_PAGE_ROOT_CLASS,
} from "@/lib/appShellLayout";
import { openShareCommentsSheet } from "@/lib/shareCommentsSheet";

function relativeTime(iso: string) {
  return formatRelativeTime(iso, { nowLabel: "now" });
}

type RawNotification = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  type: string;
  venue_id: string | null;
  story_id: string | null;
  chat_id: string | null;
  message_preview: string | null;
  created_at: string;
  read: boolean;
};

async function enrichNotificationRows(rows: RawNotification[], meId: string): Promise<NotificationWithMeta[]> {
  if (rows.length === 0) return [];
  const actorIds = Array.from(new Set(rows.map((n) => n.actor_user_id).filter(Boolean)));
  const venueIds = Array.from(new Set(rows.map((n) => n.venue_id).filter(Boolean)));
  const storyIds = Array.from(
    new Set(
      rows
        .filter((n) => (n.type === "story_like" || n.type === "story_comment") && n.story_id)
        .map((n) => n.story_id as string)
    )
  );
  const { theyBlockedMe, iBlockedThem } = await getBlockDirections(supabase, meId);

  const actorLabelFor = (actorId: string, meta: { username: string | null; display_name: string | null }) => {
    if (theyBlockedMe.has(actorId)) return "This user blocked you";
    if (iBlockedThem.has(actorId)) return "Blocked user";
    return meta.display_name?.trim() || meta.username?.trim() || "Someone";
  };

  const actorById: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
  const venueById: Record<string, string> = {};

  if (actorIds.length) {
    const { data: actorRows } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", actorIds);
    (actorRows ?? []).forEach((row: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => {
      actorById[row.id] = {
        username: row.username ?? null,
        display_name: row.display_name ?? null,
        avatar_url: row.avatar_url ?? null,
      };
    });
  }
  if (venueIds.length) {
    const { data: venueRows } = await supabase.from("venues").select("id, name").in("id", venueIds);
    (venueRows ?? []).forEach((row: { id: string; name: string | null }) => {
      venueById[row.id] = row.name ?? "Venue";
    });
  }

  const storyShareById: Record<string, boolean> = {};
  if (storyIds.length) {
    const { data: storyRows } = await supabase.from("stories").select("id, is_share").in("id", storyIds);
    (storyRows ?? []).forEach((row: { id: string; is_share?: boolean | null }) => {
      storyShareById[row.id] = isStoryRowShareFlag(row.is_share);
    });
  }

  return rows.map((n) => {
    const meta = actorById[n.actor_user_id] ?? { username: null, display_name: null, avatar_url: null };
    const friendReqType = n.type === "friend_request_received" || n.type === "friend_request_accepted";
    const snap = friendReqType ? decodeFriendRequestNotificationPreview(n.message_preview) : {};
    const merged = {
      username: meta.username ?? snap.username ?? null,
      display_name: meta.display_name ?? snap.display_name ?? null,
      avatar_url: meta.avatar_url ?? snap.avatar_url ?? null,
    };
    const actor_label = friendReqType
      ? merged.display_name?.trim() || merged.username?.trim() || "Someone"
      : actorLabelFor(n.actor_user_id, {
          username: merged.username,
          display_name: merged.display_name,
        });
    return {
      ...n,
      type: n.type as NotificationWithMeta["type"],
      actor_username: merged.username,
      actor_display_name: merged.display_name,
      actor_avatar_url: merged.avatar_url ?? null,
      actor_label,
      venue_name: n.venue_id ? venueById[n.venue_id] ?? null : null,
      story_is_share:
        n.story_id && (n.type === "story_like" || n.type === "story_comment")
          ? (storyShareById[n.story_id] ?? null)
          : null,
    };
  });
}

function GroupedAvatarStack({
  urls,
  usernames,
  totalCount,
}: {
  urls: (string | null)[];
  usernames: (string | null)[];
  totalCount: number;
}) {
  const shown = urls.slice(0, 3);
  const extra = Math.max(0, totalCount - shown.length);
  return (
    <div className="relative flex h-9 shrink-0 items-center" aria-hidden>
      {shown.map((src, i) => (
        <div
          key={`${usernames[i] ?? i}-${i}`}
          className="relative -ml-2 first:ml-0"
          style={{ zIndex: 10 - i }}
        >
          <Avatar src={src} fallbackText={usernames[i] ?? "?"} size="sm" className="ring-2 ring-black" />
        </div>
      ))}
      {extra > 0 ? (
        <div
          className="ah-glass-control relative -ml-2 grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold text-white/90 ring-2 ring-black"
          style={{ zIndex: 4 }}
        >
          <span>+{extra}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const goBackSafe = () => navigateBack(router, "/hub");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationWithMeta[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(true);
  const [friendRequests, setFriendRequests] = useState<
    Array<{
      id: string;
      requester_id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      created_at: string;
    }>
  >([]);

  const loadNotifications = useCallback(async (uid: string) => {
    const { data: notificationRows } = await supabase
      .from("notifications")
      .select(
        "id, recipient_user_id, actor_user_id, type, venue_id, story_id, chat_id, message_preview, created_at, read"
      )
      .eq("recipient_user_id", uid)
      .neq("type", "message")
      .order("created_at", { ascending: false })
      .limit(200);
    const enriched = await enrichNotificationRows((notificationRows ?? []) as RawNotification[], uid);
    setItems(enriched);
  }, []);

  const loadFriendRequestStrip = useCallback(async (uid: string) => {
    const { data: pendingRows } = await supabase
      .from("friend_requests")
      .select("id, requester_id, created_at")
      .eq("addressee_id", uid)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const blockedIds = await idsBlockedWithMe(supabase, uid);
    const visiblePending = (pendingRows ?? []).filter(
      (r: { requester_id: string }) => !blockedIds.has(r.requester_id)
    );
    const requesterIds = Array.from(new Set(visiblePending.map((r: { requester_id: string }) => r.requester_id)));
    const byId: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
    if (requesterIds.length) {
      const { data: reqProfiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", requesterIds);
      (reqProfiles ?? []).forEach((p: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => {
        byId[p.id] = {
          username: p.username ?? null,
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
        };
      });
    }
    const needSnap = requesterIds.filter((id) => {
      const p = byId[id];
      return !p || (!p.display_name?.trim() && !p.username?.trim());
    });
    const snapFromNotif: Record<string, ReturnType<typeof decodeFriendRequestNotificationPreview>> = {};
    if (needSnap.length) {
      const { data: notifRows } = await supabase
        .from("notifications")
        .select("actor_user_id, message_preview, created_at")
        .eq("recipient_user_id", uid)
        .eq("type", "friend_request_received")
        .in("actor_user_id", needSnap)
        .order("created_at", { ascending: false });
      for (const row of notifRows ?? []) {
        const aid = (row as { actor_user_id: string }).actor_user_id;
        if (snapFromNotif[aid]) continue;
        snapFromNotif[aid] = decodeFriendRequestNotificationPreview(
          (row as { message_preview: string | null }).message_preview
        );
      }
    }
    setFriendRequests(
      visiblePending.map((r: { id: string; requester_id: string; created_at: string }) => {
        const prof = byId[r.requester_id];
        const snap = snapFromNotif[r.requester_id] ?? {};
        const display_name =
          prof?.display_name?.trim() || snap.display_name?.trim() || null;
        const username = prof?.username ?? snap.username ?? null;
        const avatar_url = prof?.avatar_url ?? snap.avatar_url ?? null;
        return {
          id: r.id,
          requester_id: r.requester_id,
          created_at: r.created_at,
          username,
          display_name,
          avatar_url,
        };
      })
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }
      if (!mounted) return;
      setMeId(user.id);
      await loadNotifications(user.id);
      await loadFriendRequestStrip(user.id);
      if (!mounted) return;
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, loadNotifications, loadFriendRequestStrip]);

  useEffect(() => {
    if (!meId) return;
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
        () => {
          void loadFriendRequestStrip(meId);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meId, loadFriendRequestStrip]);

  useEffect(() => {
    if (!meId) return;
    const channel = supabase
      .channel(`notifications-page:${meId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_user_id=eq.${meId}` },
        async (payload) => {
          const ev = payload.eventType;
          if (ev === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            if (oldRow?.id) setItems((prev) => prev.filter((x) => x.id !== oldRow.id));
            return;
          }
          const row = payload.new as RawNotification & { type: string } | null;
          if (!row || row.type === "message") return;

          if (ev === "UPDATE") {
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

          if (ev === "INSERT") {
            const [enriched] = await enrichNotificationRows([row as RawNotification], meId);
            setItems((prev) => {
              if (prev.some((x) => x.id === enriched.id)) return prev;
              return [enriched, ...prev].slice(0, 200);
            });
            if (row.type === "friend_request_received") void loadFriendRequestStrip(meId);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meId, loadFriendRequestStrip]);

  const groupedItems = useMemo(() => groupNotificationFeedItems(items), [items]);

  const navigateForNotification = useCallback(
    (n: NotificationWithMeta) => {
      if (n.type === "friend_joined_venue" && n.venue_id) {
        router.push(`/map?venueId=${encodeURIComponent(n.venue_id)}`);
        return;
      }
      if (n.type === "story_comment" && n.story_id) {
        router.push(`/moments/${encodeURIComponent(n.story_id)}`);
        openShareCommentsSheet(n.story_id);
        return;
      }
      if (n.type === "story_like" && n.story_id) {
        const surface = storyEngagementSurfaceFromShareFlag(n.story_is_share);
        if (surface === "share") {
          router.push(`/moments/${encodeURIComponent(n.story_id)}`);
        } else {
          router.push("/hub");
        }
        return;
      }
      if (n.type === "friend_story") {
        const username = n.actor_username?.trim();
        if (username) {
          router.push(profileHref(n.actor_username, n.actor_user_id));
        } else {
          router.push("/hub");
        }
        return;
      }
      if (n.type === "friend_online" || n.type === "friend_nearby" || n.type === "friends_active_bundle") {
        router.push("/map");
        return;
      }
      if (n.type === "venue_popping" && n.venue_id) {
        router.push(`/map?venueId=${encodeURIComponent(n.venue_id)}`);
        return;
      }
      if (n.type === "friend_request_accepted" && n.actor_user_id) {
        router.push(profileHref(n.actor_username, n.actor_user_id));
        return;
      }
      if (n.type === "friend_request_received" && n.actor_user_id) {
        router.push(profileHref(n.actor_username, n.actor_user_id));
        return;
      }
    },
    [router]
  );

  const markReadAndNavigate = useCallback(
    async (n: NotificationWithMeta) => {
      const ids = n.grouped_row_ids?.length ? n.grouped_row_ids : [n.id];
      const needsMark = n.grouped_row_ids?.length
        ? items.some((row) => n.grouped_row_ids?.includes(row.id) && !row.read)
        : !n.read;

      if (needsMark) {
        await supabase.from("notifications").update({ read: true }).in("id", ids);
        setItems((prev) =>
          prev.map((row) => (ids.includes(row.id) ? { ...row, read: true } : row))
        );
      }
      navigateForNotification(n);
    },
    [items, navigateForNotification]
  );

  const deleteNotification = useCallback(
    async (n: NotificationWithMeta) => {
      if (!meId) return;
      const ids =
        n.grouped_row_ids && n.grouped_row_ids.length > 0 ? n.grouped_row_ids : [n.id];
      const { error } = await supabase.from("notifications").delete().in("id", ids).eq("recipient_user_id", meId);
      if (error) {
        console.error(error);
        return;
      }
      setItems((prev) => prev.filter((x) => !ids.includes(x.id)));
    },
    [meId]
  );

  const activityList = useMemo(() => {
    if (loading) return <NotificationListSkeleton rows={10} />;
    if (!groupedItems.length) {
      return (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-12 text-center">
          <p className="text-[15px] font-semibold text-white/88">You&apos;re caught up</p>
          <p className="mt-2 text-[13px] leading-snug text-white/45">
            When friends go out, react to posts, or venues heat up, it shows up here.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
        {groupedItems.map((n) => {
          const isGrouped = isGroupedStoryEngagementFeedRow(n);
          const actorName = n.actor_label || n.actor_display_name || n.actor_username || "Someone";
          const message =
            isGrouped && isStoryEngagementGroupType(n.type)
              ? storyEngagementGroupedSubtext(
                  n.type,
                  storyEngagementSurfaceFromShareFlag(n.story_is_share)
                )
              : n.type === "friend_online"
                ? `${actorName} went online`
                : n.type === "friend_nearby"
                  ? `${actorName} is nearby`
                  : n.type === "friend_joined_venue"
                    ? `${actorName} is at ${n.venue_name ?? "a venue"}`
                    : n.type === "friend_story"
                      ? `${actorName} posted a new Moment`
                      : n.type === "friend_request_received"
                        ? `${actorName} sent you a friend request`
                        : n.type === "friend_request_accepted"
                          ? `You and ${actorName} are now connected`
                          : n.type === "friends_active_bundle"
                            ? `${actorName} and friends are out right now`
                            : n.type === "story_like"
                              ? storyEngagementLikeLine(
                                  actorName,
                                  storyEngagementSurfaceFromShareFlag(n.story_is_share)
                                )
                              : n.type === "story_comment"
                                ? storyEngagementCommentLine(
                                    actorName,
                                    storyEngagementSurfaceFromShareFlag(n.story_is_share),
                                    n.message_preview
                                  )
                                : `${n.venue_name ?? "A venue"} is heating up`;

          return (
            <div
              key={n.id}
              className={`flex w-full items-stretch border-b border-white/[0.06] last:border-b-0 ${
                !n.read ? "bg-accent-violet/[0.06]" : "bg-transparent"
              }`}
            >
              <button
                type="button"
                onClick={() => void markReadAndNavigate(n)}
                className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left transition hover:bg-white/[0.03]"
              >
                {isGrouped && n.group_preview_avatars ? (
                  <GroupedAvatarStack
                    urls={n.group_preview_avatars}
                    usernames={n.group_preview_usernames ?? []}
                    totalCount={n.group_actor_count ?? n.group_preview_avatars.length}
                  />
                ) : (
                  <div
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (n.actor_user_id) router.push(profileHref(n.actor_username, n.actor_user_id));
                    }}
                    className="shrink-0 cursor-pointer"
                  >
                    <Avatar src={n.actor_avatar_url ?? null} fallbackText={actorName} size="sm" className="shrink-0" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white/92">{actorName}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-white/70">{message}</p>
                  <p className="mt-1 text-[11px] text-white/42">{relativeTime(n.created_at)}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteNotification(n);
                }}
                className="shrink-0 self-center px-3 py-2 text-white/35 transition hover:text-red-300"
                aria-label="Delete notification"
              >
                <Trash2 size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    );
  }, [groupedItems, loading, markReadAndNavigate, router, deleteNotification]);

  async function acceptRequest(requestId: string) {
    if (!meId || !requestId) return;
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req?.requester_id) return;
    const pair = await getPairBlockStatus(supabase, meId, req.requester_id);
    if (pair !== "none") {
      await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
      await loadFriendRequestStrip(meId);
      return;
    }
    const { error } = await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    if (error) {
      console.error(error);
      await loadFriendRequestStrip(meId);
      return;
    }
    if (req?.requester_id) {
      const {
        createNotification,
        encodeFriendRequestNotificationPreview,
        fetchProfileForFriendRequestNotification,
      } = await import("@/lib/notifications");
      const acceptedPreview = encodeFriendRequestNotificationPreview(
        await fetchProfileForFriendRequestNotification(meId)
      );
      await createNotification({
        recipientId: req.requester_id,
        actorId: meId,
        type: "friend_request_accepted",
        messagePreview: acceptedPreview,
      });
    }
    await loadFriendRequestStrip(meId);
  }

  async function denyRequest(requestId: string) {
    if (!meId || !requestId) return;
    const { error } = await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
    if (error) {
      console.error(error);
      return;
    }
    await loadFriendRequestStrip(meId);
  }

  return (
    <div className={`${APP_TAB_PAGE_ROOT_CLASS} text-white`}>
      <div
        className={`${APP_CONTENT_MAX_CLASS} flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 ${APP_PAGE_TAIL_PADDING_CLASS} ${APP_PAGE_TOP_PADDING_CLASS} sm:px-5`}
      >
      <AppSubpageHeader
        title="Notifications"
        subtitle="Friend requests and activity"
        onBack={goBackSafe}
        rightSlot={
          meId ? (
            <button
              type="button"
              onClick={() => router.push("/settings/notifications")}
              className="ah-glass-control ah-glass-control-interactive rounded-full px-3 py-1.5 text-[12px] font-semibold text-white/85"
            >
              <span>Settings</span>
            </button>
          ) : null
        }
      />
      <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
        <button
          type="button"
          onClick={() => setRequestOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left"
        >
          <div>
            <p className="text-[13px] font-semibold text-white/90">Friend requests</p>
            <p className="text-[11px] text-white/45">{friendRequests.length} pending</p>
          </div>
          <span className="text-[11px] font-medium text-white/50">{requestOpen ? "Hide" : "Show"}</span>
        </button>
        {requestOpen ? (
          <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
            {friendRequests.length === 0 ? (
              <p className="px-1 py-1 text-[12px] text-white/42">No pending requests.</p>
            ) : (
              friendRequests.map((r) => {
                const label = r.display_name || r.username || "Someone";
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-primary/30 px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => router.push(profileHref(r.username, r.requester_id))}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                    >
                      <Avatar src={r.avatar_url} fallbackText={label} size="sm" className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{label}</p>
                        <p className="truncate text-xs text-white/45">{r.username ? `@${r.username}` : ""}</p>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => acceptRequest(r.id)}
                      className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-black"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => denyRequest(r.id)}
                      className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80"
                    >
                      Deny
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      <div className="mt-4">{activityList}</div>
      </div>
    </div>
  );
}
