"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AuthIntencityWordmark } from "@/components/AuthIntencityWordmark";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";

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
  const router = useRouter();
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
    <AuthScreenShell marketingScroll className="transition-colors">
      <AuthIntencityWordmark className="mb-6 shrink-0" />
      <div className="mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <SubpageBackButton onBack={() => navigateBack(router, "/login")} />
        <h1 className="min-w-0 flex-1 text-[1.25rem] font-bold tracking-tight">Forgot password</h1>
      </div>
      <p className="text-sm text-text-secondary">Enter your email to receive a reset link.</p>
      <p className="mt-3 text-xs leading-relaxed text-white/55">
        On busy campus or shared Wi‑Fi, email sends can be slow or rate-limited for everyone on that network. If nothing arrives,
        wait a few minutes, try again once, or{" "}
        <span className="text-white/75">switch to cellular data</span> and request again. Don&apos;t tap send repeatedly—that uses up
        the limit faster.
      </p>

      <form onSubmit={onSubmit} className="mt-6 w-full space-y-4">
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none"
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
          className="w-full rounded-xl bg-white p-3 font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="font-medium text-accent-violet hover:text-accent-violet-active">
          Back to log in
        </Link>
      </p>
    </AuthScreenShell>
  );
}
