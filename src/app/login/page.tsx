"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { appConfig } from "@/lib/appConfig";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.replace(profile?.onboarding_complete ? "/hub" : "/onboarding");
    })();
  }, [router]);

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
        onboarding_complete: false,
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
      headers: { "Content-Type": "application/json" },
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
      router.push(next || "/hub");
    } else {
      router.push("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-primary text-text-primary p-6 transition-colors">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-2 text-text-secondary">Access your account.</p>

      <form onSubmit={onLogin} className="mt-6 space-y-4 max-w-sm">
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {msg && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{msg}</div>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-semibold p-3 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="w-full rounded-xl bg-white/10 text-white p-3"
        >
          Create an account
        </button>

        <button
          type="button"
          onClick={() => router.push("/forgot-password")}
          className="w-full rounded-xl bg-white/10 text-white/90 p-3"
        >
          Forgot password
        </button>

        <p className="text-xs text-white/50 leading-relaxed">
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
    </div>
  );
}
