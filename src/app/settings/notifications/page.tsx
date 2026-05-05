"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { registerPushSubscription } from "@/lib/pushClient";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AppSubpageHeader, APP_TAB_BOTTOM_PADDING_CLASS } from "@/components/AppSubpageHeader";

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
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [uiMsg, setUiMsg] = useState<string | null>(null);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const [initialPrefs, setInitialPrefs] = useState<{
    pushEnabled: boolean;
    friendActivityEnabled: boolean;
    venuePopEnabled: boolean;
    friendRequestEnabled: boolean;
    storiesEnabled: boolean;
    messagesEnabled: boolean;
    quietStart: string;
    quietEnd: string;
  } | null>(null);

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
          "push_enabled, friend_activity_enabled, venue_pop_enabled, friend_request_enabled, stories_enabled, messages_enabled, quiet_hours_start, quiet_hours_end"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;
      setPushEnabled(data?.push_enabled ?? true);
      setFriendActivityEnabled(data?.friend_activity_enabled ?? true);
      setVenuePopEnabled(data?.venue_pop_enabled ?? true);
      setFriendRequestEnabled(data?.friend_request_enabled ?? true);
      setStoriesEnabled(data?.stories_enabled ?? true);
      setMessagesEnabled(data?.messages_enabled ?? true);
      setQuietStart(data?.quiet_hours_start ? String(data.quiet_hours_start).slice(0, 5) : "");
      setQuietEnd(data?.quiet_hours_end ? String(data.quiet_hours_end).slice(0, 5) : "");
      setInitialPrefs({
        pushEnabled: data?.push_enabled ?? true,
        friendActivityEnabled: data?.friend_activity_enabled ?? true,
        venuePopEnabled: data?.venue_pop_enabled ?? true,
        friendRequestEnabled: data?.friend_request_enabled ?? true,
        storiesEnabled: data?.stories_enabled ?? true,
        messagesEnabled: data?.messages_enabled ?? true,
        quietStart: data?.quiet_hours_start ? String(data.quiet_hours_start).slice(0, 5) : "",
        quietEnd: data?.quiet_hours_end ? String(data.quiet_hours_end).slice(0, 5) : "",
      });
      setHasDraftChanges(false);
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
    messagesEnabled: boolean;
    quietStart: string;
    quietEnd: string;
  }) {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert({
        user_id: userId,
        push_enabled: next.pushEnabled,
        friend_activity_enabled: next.friendActivityEnabled,
        venue_pop_enabled: next.venuePopEnabled,
        friend_request_enabled: next.friendRequestEnabled,
        stories_enabled: next.storiesEnabled,
        messages_enabled: next.messagesEnabled,
        quiet_hours_start: next.quietStart || null,
        quiet_hours_end: next.quietEnd || null,
      });
      if (error) {
        console.error("notification settings save error:", error);
        setUiMsg("Could not save notification settings. Please try again.");
        return false;
      }
      return true;
    } catch (err) {
      console.error("notification settings save exception:", err);
      setUiMsg("Could not save notification settings. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const currentPrefs = {
    pushEnabled,
    friendActivityEnabled,
    venuePopEnabled,
    friendRequestEnabled,
    storiesEnabled,
    messagesEnabled,
    quietStart,
    quietEnd,
  };
  const hasUnsavedChanges =
    hasDraftChanges && !!initialPrefs && JSON.stringify(initialPrefs) !== JSON.stringify(currentPrefs);

  async function handleSaveChanges() {
    if (!userId || saving) return;
    setUiMsg(null);
    const wasPushEnabled = initialPrefs?.pushEnabled ?? pushEnabled;
    let pushWarning: string | null = null;

    // Push registration should only happen when user is enabling push.
    if (!wasPushEnabled && pushEnabled) {
      const result = await registerPushSubscription(userId);
      console.info("push registration result:", result);
      if (!result.ok) {
        pushWarning =
          result.reason === "permission_denied"
            ? "Push permission is blocked. Enable notifications in browser settings."
            : result.reason === "unsupported"
              ? "Push is unsupported here. On iPhone, use Add to Home Screen and open the app from there."
              : result.reason === "missing_vapid"
                ? "Push is not configured yet on this deploy."
                : result.reason === "subscribe_failed"
                  ? "Push subscription failed on this device. Try from Home Screen app and re-allow notifications."
                  : result.reason === "db_error"
                    ? "Push subscription could not be saved."
                    : "Push could not be enabled on this device.";
        // Keep the user's preference saved even if subscription failed.
        // They may resolve permissions/PWA context later and retry without losing settings.
      }
    }

    const ok = await save(currentPrefs);
    if (!ok) return;
    setInitialPrefs(currentPrefs);
    setHasDraftChanges(false);
    setUiMsg(pushWarning ? `${pushWarning} Preference saved.` : "Notification settings saved.");
  }

  if (loading) {
    return (
      <AuthScreenShell className={`text-white ${APP_TAB_BOTTOM_PADDING_CLASS}`}>
        <SkeletonLine width={72} height={14} className="mb-6 rounded-md" />
        <SkeletonLine width={220} height={26} className="mb-2 rounded-md" />
        <SkeletonLine width="100%" height={44} className="mb-8 max-w-md rounded-md opacity-70" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLine key={i} width="100%" height={72} className="rounded-2xl" />
          ))}
        </div>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell className={`text-white ${APP_TAB_BOTTOM_PADDING_CLASS}`}>
      <AppSubpageHeader
        title="Notification settings"
        subtitle="Tune alerts without spam."
        onBack={goBackSafe}
      />

      <div className="mt-6 space-y-3">
        <button
          onClick={() => {
            setPushEnabled((v) => !v);
            setHasDraftChanges(true);
          }}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.07]"
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
          onClick={() => {
            setMessagesEnabled((v) => !v);
            setHasDraftChanges(true);
          }}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.07]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Messages</div>
              <div className="text-xs text-white/50 mt-1">Allow message alerts and in-app toasts.</div>
            </div>
            <div className={`h-6 w-11 rounded-full transition ${messagesEnabled ? "bg-accent-violet" : "bg-white/20"}`}>
              <div
                className={`h-5 w-5 rounded-full bg-white mt-0.5 transition ${
                  messagesEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </div>
        </button>
        <button
          onClick={() => {
            setFriendActivityEnabled((v) => !v);
            setHasDraftChanges(true);
          }}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.07]"
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
          onClick={() => {
            setVenuePopEnabled((v) => !v);
            setHasDraftChanges(true);
          }}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.07]"
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
          onClick={() => {
            setStoriesEnabled((v) => !v);
            setHasDraftChanges(true);
          }}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.07]"
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
          onClick={() => {
            setFriendRequestEnabled((v) => !v);
            setHasDraftChanges(true);
          }}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.07]"
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

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="font-medium">Quiet hours</div>
          <div className="mt-1 text-xs text-white/50">No push delivery during this window.</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="time"
              value={quietStart}
              onChange={(e) => {
                setQuietStart(e.target.value);
                setHasDraftChanges(true);
              }}
              className="rounded-xl border border-white/10 bg-black/20 p-2 text-sm outline-none"
            />
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => {
                setQuietEnd(e.target.value);
                setHasDraftChanges(true);
              }}
              className="rounded-xl border border-white/10 bg-black/20 p-2 text-sm outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={saving || !hasUnsavedChanges}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_0_24px_rgba(122,60,255,0.15)] disabled:opacity-45"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      {uiMsg ? (
        <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-snug text-amber-200/95">
          {uiMsg}
        </div>
      ) : null}
      {saving ? <div className="mt-4 text-xs text-white/50">Saving…</div> : null}
    </AuthScreenShell>
  );
}

