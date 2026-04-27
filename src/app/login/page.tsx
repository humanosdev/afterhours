"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return setMsg(error.message);

    router.push("/profile");
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-2 text-white/60">Access your account.</p>

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

        {msg && <div className="text-sm text-red-400">{msg}</div>}

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
