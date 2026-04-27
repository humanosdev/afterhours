"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSignup(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setMsg(null);

  // 🔒 TEMPLE EMAIL GATE (ADD THIS)
  if (!email.toLowerCase().endsWith("@temple.edu")) {
    setLoading(false);
    setMsg("Temple email (@temple.edu) required during beta.");
    return;
  }

  // ✅ AUTH ONLY — profile row is created by DB trigger
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  setLoading(false);

  if (error) {
    return setMsg(error.message);
  }

  router.push("/profile");
}


  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <p className="mt-2 text-white/60">Create your account.</p>

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

        {msg && <div className="text-sm text-red-400">{msg}</div>}

        <button
          disabled={loading}
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
