"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AuthIntencityWordmark } from "@/components/AuthIntencityWordmark";

function passwordValidation(value: string) {
  const hasMin = value.length >= 8;
  const hasNumber = /\d/.test(value);
  const hasLetter = /[A-Za-z]/.test(value);
  return hasMin && hasNumber && hasLetter;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  /** Parse `#access_token=…&type=recovery` from the email link into a Supabase session (client-only hash). */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) setRecoveryReady(true);
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setRecoveryReady(true);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!passwordValidation(password)) {
      setMsg("Password must be at least 8 characters and include letters and numbers.");
      return;
    }
    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Password updated. Redirecting to login…");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <AuthScreenShell marketing>
      <AuthIntencityWordmark className="mb-8 shrink-0" />
      <h1 className="text-center text-2xl font-semibold tracking-tight">Reset password</h1>
      <p className="mt-2 text-center text-sm text-text-secondary">Choose a new password for your account.</p>

      {sessionChecked && !recoveryReady ? (
        <p className="mt-4 text-center text-sm text-text-muted">
          Open this page from the link in your reset email (or request a new link from{" "}
          <button
            type="button"
            className="text-text-secondary underline underline-offset-2"
            onClick={() => router.push("/forgot-password")}
          >
            Forgot password
          </button>
          ).
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 w-full space-y-4">
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="New password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Confirm new password"
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-accent-violet"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          Show password
        </label>

        {msg ? (
          <div
            className={`rounded-xl border p-3 text-sm ${
              msg.includes("Redirecting") || msg.includes("updated")
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-400/30 bg-red-500/10 text-red-300"
            }`}
          >
            {msg}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-semibold p-3 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </AuthScreenShell>
  );
}

