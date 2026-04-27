"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Password reset email sent. Check your inbox.");
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <p className="mt-2 text-white/60 text-sm">Enter your email to receive a reset link.</p>

      <form onSubmit={onSubmit} className="mt-6 max-w-sm space-y-4">
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        {msg ? <div className="text-sm text-white/70">{msg}</div> : null}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-semibold p-3 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </div>
  );
}

