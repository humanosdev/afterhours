"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AuthIntencityWordmark } from "@/components/AuthIntencityWordmark";

function getResetPasswordErrorMessage(rawMessage: string) {
  const msg = rawMessage.toLowerCase();
  if (
    msg.includes("email rate limit") ||
    msg.includes("rate limit") ||
    msg.includes("security purposes") ||
    msg.includes("too many requests") ||
    msg.includes("only request this once")
  ) {
    return "Too many reset emails were requested from this device or network. Wait a while (often 15–60 minutes), then try again—or switch between Wi‑Fi and cellular. This is a temporary send limit, not proof your password is wrong.";
  }
  if (msg.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  return rawMessage;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"neutral" | "error" | "success">("neutral");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setMsgTone("neutral");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);

    if (error) {
      setMsgTone("error");
      setMsg(getResetPasswordErrorMessage(error.message || ""));
      return;
    }

    setMsgTone("success");
    setMsg(
      "Password reset email sent. Check your inbox (and spam). On campus Wi‑Fi, try cellular if it doesn’t show up within a few minutes."
    );
  }

  return (
    <AuthScreenShell marketing>
      <AuthIntencityWordmark className="mb-8 shrink-0" />
      <h1 className="text-center text-2xl font-semibold tracking-tight">Forgot password</h1>
      <p className="mt-2 text-center text-sm text-text-secondary">Enter your email to receive a reset link.</p>
      <p className="mt-3 text-center text-xs leading-relaxed text-white/55">
        On busy campus or shared Wi‑Fi, email sends can be slow or rate-limited for everyone on that network. If nothing arrives,
        wait a few minutes, try again once, or{" "}
        <span className="text-white/75">switch to cellular data</span> and request again. Don&apos;t tap send repeatedly—that uses up
        the limit faster.
      </p>

      <form onSubmit={onSubmit} className="mt-6 w-full space-y-4">
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        {msg ? (
          <div
            className={`rounded-xl border p-3 text-sm ${
              msgTone === "error"
                ? "border-red-400/30 bg-red-500/10 text-red-300"
                : msgTone === "success"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-text-secondary"
            }`}
          >
            {msg}
          </div>
        ) : null}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-semibold p-3 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthScreenShell>
  );
}

