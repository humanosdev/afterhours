"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (password.length < 6) {
      setMsg("Password must be at least 6 characters.");
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
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-white/60 text-sm">Choose a new password for your account.</p>

      <form onSubmit={onSubmit} className="mt-6 max-w-sm space-y-4">
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Confirm new password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        {msg ? <div className="text-sm text-white/70">{msg}</div> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-semibold p-3 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}

