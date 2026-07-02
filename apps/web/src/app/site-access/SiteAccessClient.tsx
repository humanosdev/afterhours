"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MarketingBrandMark } from "@/components/marketing/MarketingBrandMark";
import { submitSiteAccessPassword } from "./actions";

export default function SiteAccessClient() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitSiteAccessPassword(password);
      if (!result.ok) {
        if (result.error === "not_configured") {
          setError("Preview password is not configured on the server.");
        } else {
          setError("Wrong password. Try again.");
        }
        return;
      }
      window.location.assign(nextPath.startsWith("/") ? nextPath : "/");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-primary px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <MarketingBrandMark iconClassName="h-10 w-10" sloganClassName="text-sm" />
        </div>
        <h1 className="mt-8 text-center text-xl font-semibold text-white">Site access</h1>
        <p className="mt-2 text-center text-sm text-white/50">
          Enter the preview password to view Intencity.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Password"
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent-violet/40 focus:ring-2 focus:ring-accent-violet/25"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="w-full rounded-full bg-accent-violet py-3 text-sm font-semibold text-white transition hover:bg-accent-violet-active disabled:opacity-50"
          >
            {submitting ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
