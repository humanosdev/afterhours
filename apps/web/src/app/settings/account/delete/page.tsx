"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { clearUserPresenceOnSignOut } from "@/lib/userPresenceWrite";
import { AppSubpageHeader, APP_TAB_BOTTOM_PADDING_CLASS, navigateBack } from "@/components/AppSubpageHeader";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lifecycle, setLifecycle] = useState<"active" | "paused" | "delete_pending" | null>(null);
  const [purgeAt, setPurgeAt] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?next=/settings/account/delete");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_lifecycle_state, account_purge_at")
        .eq("id", user.id)
        .maybeSingle();
      const st = profile?.account_lifecycle_state;
      if (st === "paused" || st === "delete_pending" || st === "active") {
        setLifecycle(st);
      } else {
        setLifecycle("active");
      }
      setPurgeAt(typeof profile?.account_purge_at === "string" ? profile.account_purge_at : null);
      setLoading(false);
    })();
  }, [router]);

  const onScheduleDeletion = async () => {
    if (!acknowledged || busy || lifecycle === "delete_pending") return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("request_account_deletion");
    setBusy(false);
    if (rpcError) {
      console.error(rpcError);
      setError("Could not schedule deletion. Try again.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) await clearUserPresenceOnSignOut(supabase, user.id);
    await supabase.auth.signOut();
    router.replace("/login?account=deleted");
  };

  const purgeLabel =
    purgeAt && lifecycle === "delete_pending"
      ? new Date(purgeAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : null;

  return (
    <div
      className={`min-h-[100dvh] bg-primary text-white px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-5 ${APP_TAB_BOTTOM_PADDING_CLASS}`}
    >
      <AppSubpageHeader
        title="Delete account"
        subtitle="Permanent removal after a grace period."
        onBack={() => navigateBack(router, "/settings")}
        className="mb-0"
      />

      {loading ? (
        <p className="mt-8 text-sm text-white/50">Loading…</p>
      ) : lifecycle === "delete_pending" ? (
        <div className="mt-6 space-y-4">
          <p className="text-[14px] leading-relaxed text-white/78">
            You already have deletion scheduled.
            {purgeLabel ? (
              <>
                {" "}
                Public data is set to be removed after{" "}
                <span className="font-semibold text-white">{purgeLabel}</span>.
              </>
            ) : (
              " When the scheduled time passes, public data removal can run on the server."
            )}{" "}
            Until then, others only see a generic empty profile.
          </p>
          <p className="text-[13px] leading-relaxed text-white/55">
            To stop deletion, open Settings and use <span className="text-white/75">Cancel account deletion</span>.
          </p>
          <Link
            href="/settings"
            className="inline-flex rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
          >
            Back to Settings
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-red-400/20 bg-red-500/[0.08] p-4 text-[14px] leading-relaxed text-red-100/90">
            <p className="font-semibold text-red-100">What deleting does</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-red-50/85">
              <li>
                You are <span className="font-medium text-red-50">signed out</span> after you confirm below. This starts
                a <span className="font-medium text-red-50">30-day</span> period: your account looks like a generic empty
                profile to others (same idea as pause), then scheduled <span className="font-medium text-red-50">public</span>{" "}
                data removal runs on the server.
              </li>
              <li>
                Before the removal date, you can <span className="font-medium text-red-50">sign in again</span> and tap{" "}
                <span className="font-medium text-red-50">Cancel account deletion</span> in Settings to restore a normal
                active account.
              </li>
              <li>
                After purge, your public rows in the app database are deleted. <span className="font-medium text-red-50">Reusing your email</span>{" "}
                for a new login still requires removing or updating the Supabase Auth user (Admin API or support)—that is
                not automatic from this screen alone.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-[13px] leading-relaxed text-white/65">
            <span className="font-medium text-white/85">Pause instead?</span> If you only want a break and to reappear
            when you log in again—with no 30-day purge path—use{" "}
            <Link href="/settings/account/pause" className="font-medium text-accent-violet underline-offset-2 hover:underline">
              Pause account
            </Link>
            .
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] p-3.5 text-[13px] leading-snug text-white/75">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-transparent accent-accent-violet"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              I understand I will be signed out, deletion will be scheduled with a 30-day grace period, public data will be
              removed after that unless I cancel in Settings, and email reuse depends on Auth being updated separately.
            </span>
          </label>

          {error ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
          ) : null}

          <button
            type="button"
            disabled={!acknowledged || busy}
            onClick={onScheduleDeletion}
            className="w-full rounded-xl border border-red-300/35 bg-red-500/20 py-3.5 text-[15px] font-semibold text-red-50 transition hover:bg-red-500/28 active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "Scheduling…" : "Schedule account deletion and sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
