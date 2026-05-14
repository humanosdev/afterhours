"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { AppSubpageHeader, APP_TAB_BOTTOM_PADDING_CLASS, navigateBack } from "@/components/AppSubpageHeader";

export default function PauseAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?next=/settings/account/pause");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_lifecycle_state")
        .eq("id", user.id)
        .maybeSingle();
      const st = profile?.account_lifecycle_state;
      if (st === "delete_pending") {
        setBlocked("You already have account deletion scheduled. Go back to Settings to cancel it first if you want to pause instead.");
        setLoading(false);
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  const onPause = async () => {
    if (!acknowledged || busy || blocked) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("pause_my_account");
    setBusy(false);
    if (rpcError) {
      console.error(rpcError);
      setError("Could not pause your account. Try again.");
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login?account=paused");
  };

  return (
    <div
      className={`min-h-[100dvh] bg-primary text-white px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-5 ${APP_TAB_BOTTOM_PADDING_CLASS}`}
    >
      <AppSubpageHeader
        title="Pause account"
        subtitle="Step away without losing your account."
        onBack={() => navigateBack(router, "/settings")}
        className="mb-0"
      />

      {loading ? (
        <p className="mt-8 text-sm text-white/50">Loading…</p>
      ) : blocked ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm leading-relaxed text-white/75">{blocked}</p>
          <Link
            href="/settings"
            className="inline-flex rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
          >
            Back to Settings
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-[14px] leading-relaxed text-white/78">
            <p className="font-semibold text-white">What pausing does</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-white/72">
              <li>
                You are <span className="text-white/90">signed out</span> on this device. You can sign in again whenever
                you want; logging back in turns your account <span className="text-white/90">active</span> again.
              </li>
              <li>
                While you are paused, other people see you as a generic <span className="text-white/90">User</span> with
                an empty profile: no moments, shares, status, or friend-style presence on the map and similar surfaces.
              </li>
              <li>
                Pausing is <span className="text-white/90">reversible</span> at any time by signing in. It does not
                schedule permanent data removal.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] leading-relaxed text-white/55">
            Pausing is not the same as deleting your account. If you want a timed path to permanent removal and email
            release (after purge and Auth cleanup), use{" "}
            <Link href="/settings/account/delete" className="font-medium text-accent-violet underline-offset-2 hover:underline">
              Delete account
            </Link>{" "}
            from Settings instead.
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] p-3.5 text-[13px] leading-snug text-white/75">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-transparent accent-accent-violet"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>I understand I will be signed out, and others will only see a generic empty profile until I sign in again.</span>
          </label>

          {error ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
          ) : null}

          <button
            type="button"
            disabled={!acknowledged || busy}
            onClick={onPause}
            className="w-full rounded-xl bg-white py-3.5 text-[15px] font-semibold text-black transition active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "Pausing…" : "Pause account and sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
