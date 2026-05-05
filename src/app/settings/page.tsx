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
      { href: "/terms", label: "Terms of Service", desc: "Understand how Intencity works." },
      { href: "/privacy", label: "Privacy Policy", desc: "How your data is handled." },
      { href: "/guidelines", label: "Community Guidelines", desc: "Keep Intencity safe and respectful." },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [autoVenueTourEnabled, setAutoVenueTourEnabled] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [feedbackCategory, setFeedbackCategory] = useState<"feature" | "bug" | "general">("feature");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
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
    setPrivacyError(null);
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
      setPrivacyError("Could not update privacy. Try again.");
    }
  };

  const submitFeedback = async () => {
    const text = feedbackText.trim();
    if (text.length < 8) {
      setFeedbackMsg("Please write at least a short description.");
      return;
    }
    setFeedbackSending(true);
    setFeedbackMsg(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: feedbackCategory,
        message: text,
      }),
    });
    setFeedbackSending(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      if (payload?.error === "feedback_email_not_configured") {
        setFeedbackMsg("Feedback email is not configured on the server yet.");
        return;
      }
      setFeedbackMsg("Could not send feedback right now. Please try again.");
      return;
    }
    setFeedbackText("");
    setFeedbackCategory("feature");
    setFeedbackMsg("Thanks — feedback sent.");
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-5">
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          type="button"
          onClick={goBackSafe}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[17px] text-white/80"
          aria-label="Back"
        >
          ←
        </button>
        <div className="min-w-0">
          <h1 className="text-[1.25rem] font-bold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-[13px] text-white/48">Account, alerts, and privacy.</p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <section>
          <div className="text-xs tracking-wide uppercase text-white/50 mb-2">Map</div>
          <button
            type="button"
            onClick={toggleAutoVenueTour}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-left transition-colors hover:bg-white/[0.07]"
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
          {privacyError ? (
            <div className="mb-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{privacyError}</div>
          ) : null}
          <button
            type="button"
            onClick={togglePrivateAccount}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-left transition-colors hover:bg-white/[0.07]"
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
        <section>
          <div className="text-xs tracking-wide uppercase text-white/50 mb-2">Feedback</div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="font-medium">Suggest a feature or report an issue</div>
            <div className="mt-1 text-xs text-white/50">
              This sends feedback directly to the team email.
            </div>
            <div className="mt-3 flex gap-2">
              {(["feature", "bug", "general"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFeedbackCategory(opt)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    feedbackCategory === opt
                      ? "border-white/40 bg-white/15 text-white"
                      : "border-white/10 bg-transparent text-white/70"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What should we add or improve?"
              className="mt-3 h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-white/20"
            />
            {feedbackMsg ? <div className="mt-2 text-xs text-white/70">{feedbackMsg}</div> : null}
            <button
              type="button"
              onClick={submitFeedback}
              disabled={feedbackSending}
              className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {feedbackSending ? "Sending..." : "Send feedback"}
            </button>
          </div>
        </section>

        {sections.map((section) => (
          <section key={section.title}>
            <div className="text-xs tracking-wide uppercase text-white/50 mb-2">{section.title}</div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 transition-colors hover:bg-white/[0.07]"
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

