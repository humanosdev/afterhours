"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { appConfig } from "@/lib/appConfig";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ensureProfileExists } from "@/lib/ensureProfile";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);

  function isTempleEmail(value: string) {
    return value.toLowerCase().trim().endsWith("@temple.edu");
  }

  function passwordValidation(value: string) {
    const hasMin = value.length >= 8;
    const hasNumber = /\d/.test(value);
    const hasLetter = /[A-Za-z]/.test(value);
    return hasMin && hasNumber && hasLetter;
  }

  function getSignupErrorMessage(rawMessage: string) {
    const msg = rawMessage.toLowerCase();

    if (msg.includes("user already registered")) {
      return "An account with this email already exists. Try logging in or resetting your password.";
    }
    if (msg.includes("email rate limit") || msg.includes("security purposes") || msg.includes("too many requests")) {
      return "Too many signup attempts right now. Please wait a minute and try again.";
    }
    if (msg.includes("invalid email")) {
      return "Please enter a valid Temple email.";
    }
    if (msg.includes("email address not authorized")) {
      return "This email is not allowed to sign up for this app.";
    }
    if (msg.includes("error sending confirmation email")) {
      return "We couldn't send the verification email right now. Please try again shortly.";
    }
    if (msg.includes("password")) {
      return "Password does not meet requirements. Use at least 8 characters with letters and numbers.";
    }
    if (msg.includes("database error saving new user")) {
      return "Signup is temporarily unavailable due to a server issue. Please try again soon.";
    }

    return "Signup failed. Please try again or use Forgot Password if you already created an account.";
  }

  async function onSignup(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setMsg(null);
  setSuccessMsg(null);

  if (!isTempleEmail(email)) {
    setLoading(false);
    setMsg("Use a Temple University email to join AfterHours.");
    return;
  }

  if (!passwordValidation(password)) {
    setLoading(false);
    setMsg("Password must be at least 8 characters and include letters and numbers.");
    return;
  }

  if (!agreedToPolicies) {
    setLoading(false);
    setMsg("Please confirm you agree to the Terms and Privacy Policy.");
    return;
  }

  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });

  setLoading(false);

  if (error) {
    return setMsg(getSignupErrorMessage(error.message || ""));
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    await ensureProfileExists(sessionData.session.user.id);
    await fetch("/api/legal/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termsVersion: appConfig.termsVersion,
        privacyVersion: appConfig.privacyVersion,
      }),
    });
  }

  setSuccessMsg("Check your Temple email to verify your account.");
}


  return (
    <div className="min-h-screen bg-primary text-text-primary p-6">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <p className="mt-2 text-text-secondary">Create your account.</p>

      <form onSubmit={onSignup} className="mt-6 space-y-4 max-w-sm">
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 outline-none"
          placeholder="Password (min 6)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-text-secondary">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-accent-violet"
            checked={agreedToPolicies}
            onChange={(e) => setAgreedToPolicies(e.target.checked)}
            required
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-white/80 underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-white/80 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {msg && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{msg}</div>}
        {successMsg && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {successMsg}
          </div>
        )}

        <button
          disabled={loading || !agreedToPolicies}
          className="w-full rounded-xl bg-white text-black font-semibold p-3 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full rounded-xl bg-white/10 text-white p-3"
        >
          Back to login
        </button>

      </form>
    </div>
  );
}
