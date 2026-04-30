"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { formatRelativeTime } from "@/lib/time";
import type { NotificationWithMeta } from "../../../types/notifications";

function relativeTime(iso: string) {
  return formatRelativeTime(iso, { nowLabel: "now" });
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
  const [friendRequests, setFriendRequests] = useState<Array<{
    id: string;
    requester_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  }>>([]);

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

      const { data: notifications } = await supabase
        .from("notifications")
        .select("id, recipient_user_id, actor_user_id, type, venue_id, created_at, read")
        .eq("recipient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      const rows = (notifications ?? []) as NotificationWithMeta[];
      if (!mounted) return;

      const actorIds = Array.from(new Set(rows.map((n) => n.actor_user_id)));
      const venueIds = Array.from(new Set(rows.map((n) => n.venue_id).filter(Boolean))) as string[];

      let actorById: Record<string, any> = {};
      let venueById: Record<string, any> = {};

      if (actorIds.length) {
        const { data: actors } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", actorIds);
        (actors ?? []).forEach((a: any) => {
          actorById[a.id] = a;
        });
      }

      if (venueIds.length) {
        const { data: venues } = await supabase
          .from("venues")
          .select("id, name")
          .in("id", venueIds);
        (venues ?? []).forEach((v: any) => {
          venueById[v.id] = v;
        });
      }

      const hydrated = rows.map((n) => {
        const actor = actorById[n.actor_user_id];
        const venue = n.venue_id ? venueById[n.venue_id] : null;
        return {
          ...n,
          actor_username: actor?.username ?? null,
          actor_display_name: actor?.display_name ?? null,
          actor_avatar_url: actor?.avatar_url ?? null,
          venue_name: venue?.name ?? null,
        };
      });

      const unreadIds = hydrated.filter((n) => !n.read).map((n) => n.id);
      setItems(
        hydrated.map((n) =>
          unreadIds.includes(n.id)
            ? {
                ...n,
                read: true,
              }
            : n
        )
      );
      setLoading(false);

      // Mark unread as read once viewed.
      if (unreadIds.length) {
        await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      }

      const { data: pendingRows } = await supabase
        .from("friend_requests")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const requesterIds = Array.from(new Set((pendingRows ?? []).map((r: any) => r.requester_id)));
      let byId: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
      if (requesterIds.length) {
        const { data: reqProfiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", requesterIds);
        (reqProfiles ?? []).forEach((p: any) => {
          byId[p.id] = {
            username: p.username ?? null,
            display_name: p.display_name ?? null,
            avatar_url: p.avatar_url ?? null,
          };
        });
      }
      if (!mounted) return;
      setFriendRequests(
        (pendingRows ?? []).map((r: any) => ({
          id: r.id,
          requester_id: r.requester_id,
          created_at: r.created_at,
          username: byId[r.requester_id]?.username ?? null,
          display_name: byId[r.requester_id]?.display_name ?? null,
          avatar_url: byId[r.requester_id]?.avatar_url ?? null,
        }))
      );
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const content = useMemo(() => {
    if (loading) return <div className="py-8 text-center text-[14px] text-white/45">Loading activity…</div>;
    if (!items.length)
      return (
        <div className="py-14 text-center">
          <p className="text-[15px] font-semibold text-white/88">Nothing new yet</p>
          <p className="mt-2 px-4 text-[13px] leading-snug text-white/45">
            When friends move, post, or reach out, it lands here.
          </p>
        </div>
      );

    return (
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
        {items.map((n) => {
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
              : `${n.venue_name ?? "A venue"} is heating up`;

          return (
            <button
              key={n.id}
              onClick={async () => {
                if (n.read) return;
                setItems((prev) =>
                  prev.map((row) => (row.id === n.id ? { ...row, read: true } : row))
                );
                await supabase.from("notifications").update({ read: true }).eq("id", n.id);
                if (n.type === "friend_joined_venue" && n.venue_id) {
                  router.push(`/map?venueId=${encodeURIComponent(n.venue_id)}`);
                  return;
                }
                if (n.type === "friend_story") {
                  router.push("/stories");
                  return;
                }
                if (n.type === "friend_request_accepted") {
                  if (n.actor_user_id) router.push(`/profile/${n.actor_user_id}`);
                  return;
                }
                if (n.type === "friend_request_received") {
                  router.push("/notifications");
                  return;
                }
              }}
              className={`flex w-full items-start gap-3 border-b border-white/[0.06] px-3 py-3 text-left last:border-b-0 ${
                n.read ? "bg-transparent" : "bg-accent-violet/[0.06]"
              } transition hover:bg-white/[0.03]`}
            >
              <div
                role="presentation"
                onClick={(e) => {
                  e.stopPropagation();
                  if (n.actor_username) router.push(`/u/${n.actor_username}`);
                }}
                className="shrink-0 cursor-pointer"
              >
                <Avatar
                  src={n.actor_avatar_url}
                  fallbackText={actorName}
                  size="sm"
                  className="shrink-0"
                />
              </div>
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
  }, [items, loading, router]);

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
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBackSafe}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[17px] text-white/80"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="text-[1.25rem] font-bold tracking-tight">Notifications</h1>
        </div>
        {meId ? (
          <button
            type="button"
            onClick={() => router.push("/settings/notifications")}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/80"
          >
            Settings
          </button>
        ) : null}
      </div>
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
      <div className="mt-4">{content}</div>
    </div>
  );
}

