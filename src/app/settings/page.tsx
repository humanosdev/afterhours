"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const sections = [
  {
    title: "Account",
    items: [
      { href: "/profile/edit", label: "Edit profile", desc: "Update your name, username, and bio." },
    ],
  },
  {
    title: "Notifications",
    items: [
      { href: "/notifications", label: "Notification center", desc: "View recent activity." },
      {
        href: "/settings/notifications",
        label: "Notification preferences",
        desc: "Control push, social alerts, and quiet hours.",
      },
    ],
  },
  {
    title: "Privacy",
    items: [
      { href: "/profile/blocks", label: "Blocked users", desc: "Manage blocked accounts." },
    ],
  },
  {
    title: "Legal",
    items: [
      { href: "/terms", label: "Terms of Service", desc: "Understand how AfterHours works." },
      { href: "/privacy", label: "Privacy Policy", desc: "How your data is handled." },
      { href: "/guidelines", label: "Community Guidelines", desc: "Keep AfterHours safe and respectful." },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [autoVenueTourEnabled, setAutoVenueTourEnabled] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const goBackSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/profile");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("map_auto_venue_tour_enabled");
    if (stored === null) {
      window.localStorage.setItem("map_auto_venue_tour_enabled", "true");
      setAutoVenueTourEnabled(true);
      return;
    }
    setAutoVenueTourEnabled(stored !== "false");
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPrivacyLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("is_private")
        .eq("id", user.id)
        .maybeSingle();
      setPrivateAccount(!!data?.is_private);
      setPrivacyLoading(false);
    })();
  }, []);

  const toggleAutoVenueTour = () => {
    if (typeof window === "undefined") return;
    const next = !autoVenueTourEnabled;
    setAutoVenueTourEnabled(next);
    window.localStorage.setItem("map_auto_venue_tour_enabled", next ? "true" : "false");
    window.dispatchEvent(new Event("map-auto-tour-setting-changed"));
  };

  const togglePrivateAccount = async () => {
    if (privacyLoading) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const next = !privateAccount;
    setPrivateAccount(next);
    const { error } = await supabase
      .from("profiles")
      .update({ is_private: next })
      .eq("id", user.id);
    if (error) {
      console.error("Failed updating privacy:", error);
      setPrivateAccount(!next);
      alert("Could not update privacy setting");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <button onClick={goBackSafe} className="mb-6 text-sm text-white/60">
        ←
      </button>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-white/60">Manage your account, alerts, and privacy controls.</p>

      <div className="mt-6 space-y-6">
        <section>
          <div className="text-xs tracking-wide uppercase text-white/50 mb-2">Map</div>
          <button
            type="button"
            onClick={toggleAutoVenueTour}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">Auto venue tour</div>
                <div className="mt-1 text-xs text-white/50">
                  Automatically cycles venue checkpoints when you are AFK.
                </div>
              </div>
              <div className={`h-6 w-11 rounded-full transition ${autoVenueTourEnabled ? "bg-accent-violet" : "bg-white/20"}`}>
                <div
                  className={`mt-0.5 h-5 w-5 rounded-full bg-white transition ${
                    autoVenueTourEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </div>
          </button>
        </section>
        <section>
          <div className="text-xs tracking-wide uppercase text-white/50 mb-2">Privacy</div>
          <button
            type="button"
            onClick={togglePrivateAccount}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">Private account</div>
                <div className="mt-1 text-xs text-white/50">
                  Only friends can view your full profile page.
                </div>
              </div>
              <div className={`h-6 w-11 rounded-full transition ${privateAccount ? "bg-accent-violet" : "bg-white/20"}`}>
                <div
                  className={`mt-0.5 h-5 w-5 rounded-full bg-white transition ${
                    privateAccount ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </div>
          </button>
        </section>

        {sections.map((section) => (
          <section key={section.title}>
            <div className="text-xs tracking-wide uppercase text-white/50 mb-2">{section.title}</div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-white/50 mt-1">{item.desc}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

