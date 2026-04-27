"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  const [notifyOnline, setNotifyOnline] = useState(true);
  const [notifyVenue, setNotifyVenue] = useState(true);

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
        .from("user_preferences")
        .select("notify_friend_online, notify_friend_joined_venue")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;
      setNotifyOnline(data?.notify_friend_online ?? true);
      setNotifyVenue(data?.notify_friend_joined_venue ?? true);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function save(next: { online: boolean; venue: boolean }) {
    if (!userId) return;
    setSaving(true);
    await supabase.from("user_preferences").upsert({
      user_id: userId,
      notify_friend_online: next.online,
      notify_friend_joined_venue: next.venue,
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
      <p className="mt-2 text-sm text-white/60">Choose what friend activity you want to hear about.</p>

      <div className="mt-6 space-y-3">
        <button
          onClick={async () => {
            const next = !notifyOnline;
            setNotifyOnline(next);
            await save({ online: next, venue: notifyVenue });
          }}
          className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Friend online notifications</div>
              <div className="text-xs text-white/50 mt-1">Get notified when friends come online.</div>
            </div>
            <div className={`h-6 w-11 rounded-full transition ${notifyOnline ? "bg-accent-violet" : "bg-white/20"}`}>
              <div
                className={`h-5 w-5 rounded-full bg-white mt-0.5 transition ${
                  notifyOnline ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </div>
        </button>

        <button
          onClick={async () => {
            const next = !notifyVenue;
            setNotifyVenue(next);
            await save({ online: notifyOnline, venue: next });
          }}
          className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Friend venue notifications</div>
              <div className="text-xs text-white/50 mt-1">Get notified when friends join venues.</div>
            </div>
            <div className={`h-6 w-11 rounded-full transition ${notifyVenue ? "bg-accent-violet" : "bg-white/20"}`}>
              <div
                className={`h-5 w-5 rounded-full bg-white mt-0.5 transition ${
                  notifyVenue ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </div>
        </button>
      </div>

      {saving ? <div className="mt-4 text-xs text-white/50">Saving…</div> : null}
    </div>
  );
}

