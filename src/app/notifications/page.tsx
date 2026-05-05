"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { formatRelativeTime } from "@/lib/time";
import type { NotificationWithMeta } from "../../../types/notifications";
import NotificationListSkeleton from "@/components/skeletons/NotificationListSkeleton";
import { AppSubpageHeader } from "@/components/AppSubpageHeader";

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

async function enrichNotificationRows(rows: RawNotification[]): Promise<NotificationWithMeta[]> {
  if (rows.length === 0) return [];
  const actorIds = Array.from(new Set(rows.map((n) => n.actor_user_id).filter(Boolean)));
  const venueIds = Array.from(new Set(rows.map((n) => n.venue_id).filter(Boolean)));

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

  return rows.map((n) => ({
    ...n,
    type: n.type as NotificationWithMeta["type"],
    actor_username: actorById[n.actor_user_id]?.username ?? null,
    actor_display_name: actorById[n.actor_user_id]?.display_name ?? null,
    actor_avatar_url: actorById[n.actor_user_id]?.avatar_url ?? null,
    venue_name: n.venue_id ? venueById[n.venue_id] ?? null : null,
  }));
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
          className="relative -ml-2 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-[10px] font-semibold text-white/90 ring-2 ring-black"
          style={{ zIndex: 4 }}
        >
          +{extra}
        </div>
      ) : null}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const goBackSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/hub");
  };
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
    const enriched = await enrichNotificationRows((notificationRows ?? []) as RawNotification[]);
    setItems(enriched);
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

      const { data: pendingRows } = await supabase
        .from("friend_requests")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const requesterIds = Array.from(new Set((pendingRows ?? []).map((r: { requester_id: string }) => r.requester_id)));
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
      if (!mounted) return;
      setFriendRequests(
        (pendingRows ?? []).map((r: { id: string; requester_id: string; created_at: string }) => ({
          id: r.id,
          requester_id: r.requester_id,
          created_at: r.created_at,
          username: byId[r.requester_id]?.username ?? null,
          display_name: byId[r.requester_id]?.display_name ?? null,
          avatar_url: byId[r.requester_id]?.avatar_url ?? null,
        }))
      );
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, loadNotifications]);

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
            const [enriched] = await enrichNotificationRows([row as RawNotification]);
            setItems((prev) => {
              if (prev.some((x) => x.id === enriched.id)) return prev;
              return [enriched, ...prev].slice(0, 200);
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId]);

  const groupedItems = useMemo(() => {
    const bundleMap = new Map<string, NotificationWithMeta[]>();
    const passthrough: NotificationWithMeta[] = [];
    for (const n of items) {
      if ((n.type === "story_like" || n.type === "story_comment") && n.story_id) {
        const key = `${n.type}:${n.story_id}`;
        const arr = bundleMap.get(key) ?? [];
        arr.push(n);
        bundleMap.set(key, arr);
      } else {
        passthrough.push(n);
      }
    }
    const bundles: NotificationWithMeta[] = [];
    for (const [key, arr] of bundleMap.entries()) {
      const distinctActors = Array.from(new Set(arr.map((x) => x.actor_user_id)));
      if (distinctActors.length >= 3) {
        const sorted = arr.slice().sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        const latest = sorted[0];
        const previewIds = distinctActors.slice(0, 3);
        const group_preview_avatars = previewIds.map((id) => {
          const hit = arr.find((r) => r.actor_user_id === id);
          return hit?.actor_avatar_url ?? null;
        });
        const group_preview_usernames = previewIds.map((id) => {
          const hit = arr.find((r) => r.actor_user_id === id);
          return hit?.actor_username ?? hit?.actor_display_name ?? null;
        });
        const anyUnread = arr.some((r) => !r.read);
        const namesForHeadline = previewIds
          .map((id) => {
            const hit = arr.find((r) => r.actor_user_id === id);
            return hit?.actor_display_name?.trim() || hit?.actor_username?.trim() || null;
          })
          .filter(Boolean) as string[];
        const headline =
          namesForHeadline.length >= 2
            ? `${namesForHeadline[0]}, ${namesForHeadline[1]}${
                distinctActors.length > 2 ? ` +${distinctActors.length - 2}` : ""
              }`
            : `${distinctActors.length} friends`;

        bundles.push({
          ...latest,
          id: `group:${key}`,
          read: !anyUnread,
          grouped_row_ids: arr.map((r) => r.id),
          group_preview_avatars,
          group_preview_usernames,
          group_actor_count: distinctActors.length,
          actor_display_name: headline,
          actor_username: null,
          actor_avatar_url: group_preview_avatars[0] ?? null,
        });
      } else {
        bundles.push(...arr);
      }
    }
    return [...passthrough, ...bundles].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [items]);

  const navigateForNotification = useCallback(
    (n: NotificationWithMeta) => {
      if (n.type === "friend_joined_venue" && n.venue_id) {
        router.push(`/map?venueId=${encodeURIComponent(n.venue_id)}`);
        return;
      }
      if ((n.type === "story_like" || n.type === "story_comment" || n.type === "friend_story") && n.story_id) {
        router.push(`/moments/${n.story_id}`);
        return;
      }
      if (n.type === "friend_story") {
        router.push("/stories");
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
        if (n.actor_username) router.push(`/u/${n.actor_username}`);
        else router.push(`/profile/${n.actor_user_id}`);
        return;
      }
      if (n.type === "friend_request_received") {
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
          const isGrouped = !!(n.grouped_row_ids && n.grouped_row_ids.length >= 3);
          const actorName = n.actor_display_name || n.actor_username || "Someone";
          const message =
            n.type === "friend_online"
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
                            ? isGrouped
                              ? `${n.group_actor_count ?? 3} friends liked your post`
                              : `${actorName} liked your post`
                            : n.type === "story_comment"
                              ? isGrouped
                                ? `${n.group_actor_count ?? 3} friends commented on your post`
                                : `${actorName} commented on your post${n.message_preview ? `: "${n.message_preview}"` : ""}`
                              : `${n.venue_name ?? "A venue"} is heating up`;

          return (
            <button
              key={n.id}
              type="button"
              onClick={() => void markReadAndNavigate(n)}
              className={`flex w-full items-start gap-3 border-b border-white/[0.06] px-3 py-3 text-left last:border-b-0 ${
                !n.read ? "bg-accent-violet/[0.06]" : "bg-transparent"
              } transition hover:bg-white/[0.03]`}
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
                    if (n.actor_username) router.push(`/u/${n.actor_username}`);
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
          );
        })}
      </div>
    );
  }, [groupedItems, loading, markReadAndNavigate, router]);

  async function acceptRequest(requestId: string) {
    if (!meId) return;
    const req = friendRequests.find((r) => r.id === requestId);
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (req?.requester_id) {
      const { createNotification } = await import("@/lib/notifications");
      await createNotification({
        recipientId: req.requester_id,
        actorId: meId,
        type: "friend_request_accepted",
      });
    }
  }

  async function denyRequest(requestId: string) {
    await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-5">
      <AppSubpageHeader
        title="Notifications"
        subtitle="Friend requests and activity"
        onBack={goBackSafe}
        rightSlot={
          meId ? (
            <button
              type="button"
              onClick={() => router.push("/settings/notifications")}
              className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/85 transition hover:bg-white/[0.1]"
            >
              Settings
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
                const label = r.display_name || r.username || "User";
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-2">
                    <Avatar src={r.avatar_url} fallbackText={label} size="sm" />
                    <button
                      type="button"
                      onClick={() => r.username && router.push(`/u/${r.username}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold">{label}</p>
                      <p className="truncate text-xs text-white/45">@{r.username ?? "user"}</p>
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
  );
}
