"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { registerPushSubscription } from "@/lib/pushClient";

export default function NotificationSettingsPage() {
  const router = useRouter();
  const goBackSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/settings");
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [friendActivityEnabled, setFriendActivityEnabled] = useState(true);
  const [venuePopEnabled, setVenuePopEnabled] = useState(true);
  const [friendRequestEnabled, setFriendRequestEnabled] = useState(true);
  const [storiesEnabled, setStoriesEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [uiMsg, setUiMsg] = useState<string | null>(null);

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
      setUserId(user.id);

      const { data } = await supabase
        .from("notification_preferences")
        .select(
          "push_enabled, friend_activity_enabled, venue_pop_enabled, friend_request_enabled, stories_enabled, quiet_hours_start, quiet_hours_end"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;
      setPushEnabled(data?.push_enabled ?? true);
      setFriendActivityEnabled(data?.friend_activity_enabled ?? true);
      setVenuePopEnabled(data?.venue_pop_enabled ?? true);
      setFriendRequestEnabled(data?.friend_request_enabled ?? true);
      setStoriesEnabled(data?.stories_enabled ?? true);
      setQuietStart(data?.quiet_hours_start ? String(data.quiet_hours_start).slice(0, 5) : "");
      setQuietEnd(data?.quiet_hours_end ? String(data.quiet_hours_end).slice(0, 5) : "");
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function save(next: {
    pushEnabled: boolean;
    friendActivityEnabled: boolean;
    venuePopEnabled: boolean;
    friendRequestEnabled: boolean;
    storiesEnabled: boolean;
    quietStart: string;
    quietEnd: string;
  }) {
    if (!userId) return;
    setSaving(true);
    await supabase.from("notification_preferences").upsert({
      user_id: userId,
      push_enabled: next.pushEnabled,
      friend_activity_enabled: next.friendActivityEnabled,
      venue_pop_enabled: next.venuePopEnabled,
      friend_request_enabled: next.friendRequestEnabled,
      stories_enabled: next.storiesEnabled,
      quiet_hours_start: next.quietStart || null,
      quiet_hours_end: next.quietEnd || null,
    });
    setSaving(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-black text-white p-6">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <button onClick={goBackSafe} className="mb-6 text-sm text-white/60">
        ←
      </button>

      <h1 className="text-2xl font-semibold">Notification Settings</h1>
      <p className="mt-2 text-sm text-white/60">Tune alerts for social urgency without spam.</p>

      <div className="mt-6 space-y-3">
        <button
          onClick={async () => {
            if (!userId) return;
            const next = !pushEnabled;
            setPushEnabled(next);
            if (next) {
              const result = await registerPushSubscription(userId);
              if (!result.ok) {
                setUiMsg("Push permission is blocked. Enable notifications in browser settings.");
                setPushEnabled(false);
                await save({
                  pushEnabled: false,
                  friendActivityEnabled,
                  venuePopEnabled,
                  friendRequestEnabled,
                  storiesEnabled,
                  quietStart,
                  quietEnd,
                });
                return;
              }
            }
            setUiMsg(null);
            await save({
              pushEnabled: next,
              friendActivityEnabled,
              venuePopEnabled,
              friendRequestEnabled,
              storiesEnabled,
              quietStart,
              quietEnd,
            });
          }}
          className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Push Notifications</div>
              <div className="text-xs text-white/50 mt-1">Enable device push alerts.</div>
            </div>
            <div className={`h-6 w-11 rounded-full transition ${pushEnabled ? "bg-accent-violet" : "bg-white/20"}`}>
              <div
                className={`h-5 w-5 rounded-full bg-white mt-0.5 transition ${
                  pushEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </div>
        </button>
        <button
          onClick={async () => {
            const next = !friendActivityEnabled;
            setFriendActivityEnabled(next);
            await save({
              pushEnabled,
              friendActivityEnabled: next,
              venuePopEnabled,
              friendRequestEnabled,
              storiesEnabled,
              quietStart,
              quietEnd,
            });
          }}
          className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Friends nearby</div>
              <div className="text-xs text-white/50 mt-1">Know when friends are out.</div>
            </div>
            <div className={`h-6 w-11 rounded-full transition ${friendActivityEnabled ? "bg-accent-violet" : "bg-white/20"}`}>
              <div
                className={`h-5 w-5 rounded-full bg-white mt-0.5 transition ${
                  friendActivityEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </div>
        </button>

        <button
          onClick={async () => {
            const next = !venuePopEnabled;
            setVenuePopEnabled(next);
            await save({
              pushEnabled,
              friendActivityEnabled,
              venuePopEnabled: next,
              friendRequestEnabled,
              storiesEnabled,
              quietStart,
              quietEnd,
            });
          }}
          className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Venue getting active</div>
              <div className="text-xs text-white/50 mt-1">Hear when venues start popping.</div>
            </div>
            <div className={`h-6 w-11 rounded-full transition ${venuePopEnabled ? "bg-accent-violet" : "bg-white/20"}`}>
              <div
                className={`h-5 w-5 rounded-full bg-white mt-0.5 transition ${
                  venuePopEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </div>
        </button>

        <button
          onClick={async () => {
            const next = !storiesEnabled;
            setStoriesEnabled(next);
            await save({
              pushEnabled,
              friendActivityEnabled,
              venuePopEnabled,
              friendRequestEnabled,
              storiesEnabled: next,
              quietStart,
              quietEnd,
            });
          }}
          className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Friend posted Moment</div>
              <div className="text-xs text-white/50 mt-1">Get notified on new Moments.</div>
            </div>
            <div className={`h-6 w-11 rounded-full transition ${storiesEnabled ? "bg-accent-violet" : "bg-white/20"}`}>
              <div className={`h-5 w-5 rounded-full bg-white mt-0.5 transition ${storiesEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </div>
        </button>

        <button
          onClick={async () => {
            const next = !friendRequestEnabled;
            setFriendRequestEnabled(next);
            await save({
              pushEnabled,
              friendActivityEnabled,
              venuePopEnabled,
              friendRequestEnabled: next,
              storiesEnabled,
              quietStart,
              quietEnd,
            });
          }}
          className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Friend request accepted</div>
              <div className="text-xs text-white/50 mt-1">Get notified on new connections.</div>
            </div>
            <div className={`h-6 w-11 rounded-full transition ${friendRequestEnabled ? "bg-accent-violet" : "bg-white/20"}`}>
              <div className={`h-5 w-5 rounded-full bg-white mt-0.5 transition ${friendRequestEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </div>
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-medium">Quiet hours</div>
          <div className="mt-1 text-xs text-white/50">No push delivery during this window.</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="time"
              value={quietStart}
              onChange={async (e) => {
                const next = e.target.value;
                setQuietStart(next);
                await save({
                  pushEnabled,
                  friendActivityEnabled,
                  venuePopEnabled,
                  friendRequestEnabled,
                  storiesEnabled,
                  quietStart: next,
                  quietEnd,
                });
              }}
              className="rounded-xl border border-white/10 bg-black/20 p-2 text-sm outline-none"
            />
            <input
              type="time"
              value={quietEnd}
              onChange={async (e) => {
                const next = e.target.value;
                setQuietEnd(next);
                await save({
                  pushEnabled,
                  friendActivityEnabled,
                  venuePopEnabled,
                  friendRequestEnabled,
                  storiesEnabled,
                  quietStart,
                  quietEnd: next,
                });
              }}
              className="rounded-xl border border-white/10 bg-black/20 p-2 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {uiMsg ? <div className="mt-4 text-xs text-amber-300">{uiMsg}</div> : null}
      {saving ? <div className="mt-4 text-xs text-white/50">Saving…</div> : null}
    </div>
  );
}

