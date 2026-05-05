"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { registerPushSubscription } from "@/lib/pushClient";
import { ensureProfileExists } from "@/lib/ensureProfile";
import { useAuthRouteTransition } from "@/components/AuthRouteTransition";

function isIos() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { start, end } = useAuthRouteTransition();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        end();
        router.replace("/login");
        return;
      }
      setUserId(data.session.user.id);
      await ensureProfileExists(data.session.user.id);
      if (isIos()) setPlatform("ios");
      else if (
        typeof window !== "undefined" &&
        /Android/.test(window.navigator.userAgent)
      ) {
        setPlatform("android");
      }
      end();
    })();
  }, [router, end]);

  const completeOnboarding = async () => {
    if (!userId || saving) return;
    setSaving(true);
    await ensureProfileExists(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", userId);
    setSaving(false);
    if (error) return;
    start();
    router.replace("/hub");
  };

  const enablePush = async () => {
    if (!userId) return;
    const result = await registerPushSubscription(userId);
    if (!result.ok) {
      setPushMsg("Push not enabled yet. You can enable it later in Settings.");
      return;
    }
    setPushMsg("Push notifications enabled.");
  };

  return (
    <div className="relative min-h-[100dvh] bg-primary text-text-primary">
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[min(52vh,30rem)] bg-gradient-to-t from-accent-violet/35 via-accent-violet/10 to-transparent"
        aria-hidden
      />
      <div className="relative z-[1] mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom,0px)+22px)] pt-[calc(env(safe-area-inset-top,0px)+24px)]">
        <div className="rounded-2xl border border-subtle bg-secondary p-5 shadow-[0_0_30px_rgba(122,60,255,0.2)]">
          <h1 className="text-3xl font-semibold tracking-tight">Intencity</h1>
          <p className="mt-2 text-sm text-text-secondary">
            See where the night is happening.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-subtle bg-secondary p-4">
            <p className="text-sm font-semibold">📍 Live Venues</p>
            <p className="mt-1 text-sm text-text-secondary">
              See active spots in real time
            </p>
          </div>
          <div className="rounded-2xl border border-subtle bg-secondary p-4">
            <p className="text-sm font-semibold">👥 Friends</p>
            <p className="mt-1 text-sm text-text-secondary">
              Know when friends are outside
            </p>
          </div>
          <div className="rounded-2xl border border-subtle bg-secondary p-4">
            <p className="text-sm font-semibold">🔥 Heat Map</p>
            <p className="mt-1 text-sm text-text-secondary">
              Find where energy is building
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-subtle bg-surface p-4">
          <p className="text-sm font-semibold">Add to Home Screen</p>
          {platform === "ios" ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
              <li>Tap Share icon</li>
              <li>Tap Add to Home Screen</li>
              <li>Launch like a real app</li>
            </ol>
          ) : platform === "android" ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
              <li>Tap browser menu</li>
              <li>Tap Install App</li>
            </ol>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">
              Install from your browser menu for the best app experience.
            </p>
          )}
          <p className="mt-3 text-xs text-text-muted">Native iOS version coming soon.</p>
          <div className="mt-4 rounded-xl border border-subtle bg-secondary/40 p-3">
            <p className="text-sm text-text-secondary">
              Stay in the loop when friends go out.
            </p>
            <button
              type="button"
              onClick={enablePush}
              className="mt-2 rounded-xl bg-accent-violet px-3 py-2 text-sm font-medium text-white shadow-glow-violet"
            >
              Enable Notifications
            </button>
            {pushMsg ? <p className="mt-2 text-xs text-text-muted">{pushMsg}</p> : null}
          </div>
        </div>

        <button
          type="button"
          onClick={completeOnboarding}
          disabled={!userId || saving}
          className="mt-auto w-full rounded-2xl bg-accent-violet py-3 text-base font-semibold text-white shadow-glow-violet disabled:opacity-50"
        >
          {saving ? "Entering..." : "Enter Intencity"}
        </button>
      </div>
    </div>
  );
}
