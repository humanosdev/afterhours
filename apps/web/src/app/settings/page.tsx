"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AppSubpageHeader, navigateBack } from "@/components/AppSubpageHeader";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
  APP_PAGE_TOP_PADDING_CLASS,
  APP_TAB_PAGE_ROOT_CLASS,
  APP_TAB_PRIMARY_SCROLL_CLASS,
} from "@/lib/appShellLayout";
import { appConfig } from "@/lib/appConfig";

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
  const [accountLifecycle, setAccountLifecycle] = useState<"active" | "paused" | "delete_pending" | null>(null);
  const [accountPurgeAt, setAccountPurgeAt] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);

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
        .select("is_private, account_lifecycle_state, account_purge_at")
        .eq("id", user.id)
        .maybeSingle();
      setPrivateAccount(!!data?.is_private);
      const st = data?.account_lifecycle_state;
      if (st === "paused" || st === "delete_pending" || st === "active") {
        setAccountLifecycle(st);
      } else {
        setAccountLifecycle("active");
      }
      setAccountPurgeAt(typeof data?.account_purge_at === "string" ? data.account_purge_at : null);
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

  const refreshAccountLifecycle = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAccountLifecycle(null);
      setAccountPurgeAt(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("account_lifecycle_state, account_purge_at")
      .eq("id", user.id)
      .maybeSingle();
    const st = data?.account_lifecycle_state;
    if (st === "paused" || st === "delete_pending" || st === "active") {
      setAccountLifecycle(st);
    } else {
      setAccountLifecycle("active");
    }
    setAccountPurgeAt(typeof data?.account_purge_at === "string" ? data.account_purge_at : null);
  };

  const onCancelDeletion = async () => {
    setAccountBusy(true);
    setAccountMsg(null);
    const { error } = await supabase.rpc("cancel_account_deletion");
    setAccountBusy(false);
    if (error) {
      console.error(error);
      setAccountMsg("Could not cancel deletion. Try again.");
      return;
    }
    await refreshAccountLifecycle();
    setAccountMsg("Deletion canceled. Your account is active again.");
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
    <div className={`${APP_TAB_PAGE_ROOT_CLASS} text-white`}>
      <div
        className={`${APP_CONTENT_MAX_CLASS} ${APP_TAB_PRIMARY_SCROLL_CLASS} bg-primary px-4 ${APP_PAGE_TAIL_PADDING_CLASS} ${APP_PAGE_TOP_PADDING_CLASS} sm:px-5`}
      >
      <AppSubpageHeader
        title="Settings"
        subtitle="Account, alerts, and privacy."
        onBack={() => navigateBack(router, "/profile")}
        className="mb-0"
      />

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
          <div className="text-xs tracking-wide uppercase text-white/50 mb-2">Account status</div>
          {accountMsg ? (
            <div className="mb-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm text-white/80">
              {accountMsg}
            </div>
          ) : null}
          {accountLifecycle === "delete_pending" && accountPurgeAt ? (
            <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
              Deletion is scheduled after{" "}
              <span className="font-semibold text-white">
                {new Date(accountPurgeAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              . Until then, others only see a generic empty profile. After that, public data is removed; freeing your
              email still requires removing the login from Supabase Auth (Admin API or support).
            </div>
          ) : null}
          <div className="space-y-2">
            {accountLifecycle === "delete_pending" ? (
              <button
                type="button"
                disabled={accountBusy}
                onClick={onCancelDeletion}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-left transition-colors hover:bg-white/[0.07] disabled:opacity-50"
              >
                <div className="font-medium">Cancel account deletion</div>
                <div className="mt-1 text-xs text-white/50">Restore a normal active profile and visibility.</div>
              </button>
            ) : (
              <>
                <Link
                  href="/settings/account/pause"
                  className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 transition-colors hover:bg-white/[0.07]"
                >
                  <div className="font-medium">Pause account</div>
                  <div className="mt-1 text-xs text-white/50">
                    Open a short guide, then sign out and hide from others until you log in again.
                  </div>
                </Link>
                <Link
                  href="/settings/account/delete"
                  className="block w-full rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-3 transition-colors hover:bg-red-500/15"
                >
                  <div className="font-medium text-red-200">Delete account</div>
                  <div className="mt-1 text-xs text-red-200/70">
                    Open a short guide: 30-day grace, then scheduled public data removal.
                  </div>
                </Link>
              </>
            )}
          </div>
        </section>
        <section>
          <div className="text-xs tracking-wide uppercase text-white/50 mb-2">Feedback</div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="font-medium">Suggest a feature or report an issue</div>
            <div className="mt-1 text-xs text-white/50">
              We route this to {appConfig.supportEmail}.
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
              className="mt-3 h-28 w-full resize-none rounded-xl border border-white/10 bg-primary/30 p-3 text-sm outline-none focus:border-white/20"
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
    </div>
  );
}

