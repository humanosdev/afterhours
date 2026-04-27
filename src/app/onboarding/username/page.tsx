"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ensureProfileExists } from "@/lib/ensureProfile";

function normalizeUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

export default function UsernameOnboardingPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const username = useMemo(() => normalizeUsername(raw), [raw]);

  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      await ensureProfileExists(data.user.id);
    })();
  }, [router]);

  // Check availability
  useEffect(() => {
    if (username.length < 3) {
      setAvailable(null);
      return;
    }

    let cancelled = false;
    setChecking(true);

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .limit(1);

      if (!cancelled) {
        setAvailable(!data || data.length === 0);
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  async function saveUsername() {
    if (!userId || !available) return;

    setSaving(true);
    setMsg(null);
    await ensureProfileExists(userId);

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          username,
        },
        { onConflict: "id" }
      );

    if (error) {
      setMsg("Username already taken.");
      setSaving(false);
      return;
    }

    router.replace("/profile");
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col justify-center">
      <h1 className="text-2xl font-semibold">Choose a username</h1>
      <p className="mt-2 text-white/60">
        This is how other people will find you.
      </p>

      <input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="username"
        className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 outline-none"
      />

      <div className="mt-2 text-sm">
        {checking && <span className="text-white/50">Checking…</span>}
        {!checking && available === true && (
          <span className="text-green-400">Available</span>
        )}
        {!checking && available === false && (
          <span className="text-red-400">Taken</span>
        )}
      </div>

      {msg && <div className="mt-2 text-red-400 text-sm">{msg}</div>}

      <button
        disabled={!available || saving}
        onClick={saveUsername}
        className="mt-6 rounded-xl bg-white text-black font-semibold px-4 py-3 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
