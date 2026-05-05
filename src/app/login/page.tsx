"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { appConfig } from "@/lib/appConfig";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthRouteTransition } from "@/components/AuthRouteTransition";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AuthIntencityWordmark } from "@/components/AuthIntencityWordmark";

export default function LoginPage() {
  const router = useRouter();
  const { start } = useAuthRouteTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .maybeSingle();
      start();
      router.replace(profile?.onboarding_complete ? "/hub" : "/onboarding");
    })();
  }, [router, start]);

  const mapLoginError = (raw: string) => {
    const text = raw.toLowerCase();
    if (text.includes("invalid login credentials")) {
      return "Email or password is incorrect.";
    }
    if (text.includes("email not confirmed")) {
      return "Please verify your email before logging in.";
    }
    return "Unable to log in right now. Please try again.";
  };

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return setMsg(mapLoginError(error.message));

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setMsg("Please verify your email before logging in.");
      return;
    }

    await supabase.from("profiles").upsert(
      {
        id: session.user.id,
      },
      { onConflict: "id" }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", session.user.id)
      .maybeSingle();

    // Record legal consent once per active terms/privacy version (audit trail).
    await fetch("/api/legal/consent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      credentials: "same-origin",
      body: JSON.stringify({
        termsVersion: appConfig.termsVersion,
        privacyVersion: appConfig.privacyVersion,
      }),
    });

    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;
    if (profile?.onboarding_complete) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ah_has_logged_in", "1");
      }
      start();
      router.push(next || "/hub");
    } else {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ah_has_logged_in", "1");
      }
      start();
      router.push("/onboarding");
    }
  }

  return (
    <AuthScreenShell marketing className="transition-colors">
      <AuthIntencityWordmark className="mb-8 shrink-0" />
      <h1 className="text-center text-2xl font-semibold tracking-tight">Log in</h1>

      <form onSubmit={onLogin} className="mt-8 w-full space-y-4">
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <div className="space-y-1.5">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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
          <div className="flex flex-col items-end gap-1">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-accent-violet hover:text-accent-violet-active"
            >
              Forgot password?
            </Link>
            <p className="max-w-[280px] text-right text-[11px] leading-snug text-white/45">
              Reset emails can stall on crowded Wi‑Fi—use cellular if the link doesn&apos;t arrive.
            </p>
          </div>
        </div>

        {msg && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{msg}</div>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-semibold p-3 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-center text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-accent-violet hover:text-accent-violet-active">
            Sign up
          </Link>
        </p>

        <p className="text-center text-xs text-white/50 leading-relaxed">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-white/80 underline underline-offset-2">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-white/80 underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthScreenShell>
  );
}
