"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import type { NotificationWithMeta } from "../../../types/notifications";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
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
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const content = useMemo(() => {
    if (loading) return <div className="text-white/60 text-sm">Loading activity…</div>;
    if (!items.length) return <div className="text-white/40 text-sm">No activity yet</div>;

    return (
      <div className="space-y-2">
        {items.map((n) => {
          const actorName = n.actor_display_name || n.actor_username || "Someone";
          const message =
            n.type === "friend_online"
              ? `${actorName} went online`
              : n.type === "friend_joined_venue"
              ? `${actorName} joined ${n.venue_name ?? "a venue"}`
              : n.type === "friend_story"
              ? `${actorName} posted a new story`
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
              }}
              className={`w-full text-left rounded-2xl border p-4 ${
                n.read ? "border-white/10 bg-white/5" : "border-accent-violet/30 bg-accent-violet/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (n.actor_username) router.push(`/u/${n.actor_username}`);
                  }}
                  className="shrink-0"
                  aria-label={`Open ${actorName} profile`}
                >
                  <Avatar
                    src={n.actor_avatar_url}
                    fallbackText={actorName}
                    size="sm"
                    className="shrink-0"
                  />
                </button>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (n.actor_username) router.push(`/u/${n.actor_username}`);
                    }}
                    className="text-sm text-white hover:underline"
                  >
                    {actorName}
                  </button>
                  <div className="text-sm text-white/85">
                    {message}
                  </div>
                  <div className="text-xs text-white/50 mt-1">{relativeTime(n.created_at)}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }, [items, loading]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={goBackSafe} className="text-sm text-white/60">
            ←
          </button>
          <h1 className="text-2xl font-semibold">Notifications</h1>
        </div>
        {meId ? (
          <button
            onClick={() => router.push("/settings/notifications")}
            className="rounded-xl border border-white/20 px-3 py-2 text-sm text-white/80"
          >
            Settings
          </button>
        ) : null}
      </div>
      {content}
    </div>
  );
}

