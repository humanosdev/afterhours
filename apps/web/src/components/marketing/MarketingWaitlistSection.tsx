"use client";

import { FormEvent, useState } from "react";
import { MARKETING_LAUNCH_CITY_LABEL } from "@/lib/marketingContent";

type FormState = "idle" | "submitting" | "success" | "duplicate" | "error";

export function MarketingWaitlistSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone.trim() || null }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; duplicate?: boolean; error?: string };

      if (res.ok && data?.duplicate) {
        setState("duplicate");
        return;
      }
      if (!res.ok || !data?.ok) {
        setState("error");
        setErrorMessage(
          data?.error === "invalid_email"
            ? "Enter a valid email address."
            : data?.error === "invalid_name"
              ? "Enter your name."
              : "Could not save your spot. Try again in a moment."
        );
        return;
      }

      setState("success");
      setName("");
      setEmail("");
      setPhone("");
    } catch {
      setState("error");
      setErrorMessage("Could not save your spot. Try again in a moment.");
    }
  }

  return (
    <section id="waitlist" className="scroll-mt-24 border-t border-white/[0.06] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-md">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
          iOS early access
        </h2>
        <p className="mx-auto mt-4 text-center text-sm leading-relaxed text-white/55 sm:text-base">
          We&apos;re rolling out in <strong className="font-medium text-white/75">{MARKETING_LAUNCH_CITY_LABEL}</strong>{" "}
          first — day and night. Join the waitlist for a TestFlight invite when the next batch opens.
        </p>

        {state === "success" ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-center text-sm text-emerald-100">
            You&apos;re on the list. We&apos;ll email you when your invite is ready.
          </div>
        ) : null}

        {state === "duplicate" ? (
          <div className="mt-8 rounded-2xl border border-accent-violet/20 bg-accent-violet/10 px-4 py-4 text-center text-sm text-white/80">
            That email is already on the waitlist — we&apos;ll be in touch.
          </div>
        ) : null}

        {state !== "success" && state !== "duplicate" ? (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <input
              type="text"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent-violet/40 focus:ring-2 focus:ring-accent-violet/25"
            />
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent-violet/40 focus:ring-2 focus:ring-accent-violet/25"
            />
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent-violet/40 focus:ring-2 focus:ring-accent-violet/25"
            />
            {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}
            <button
              type="submit"
              disabled={state === "submitting"}
              className="w-full rounded-full bg-accent-violet py-3 text-sm font-semibold text-white transition hover:bg-accent-violet-active disabled:opacity-50"
            >
              {state === "submitting" ? "Joining…" : "Join the waitlist"}
            </button>
          </form>
        ) : null}

        <p className="mt-4 text-center text-xs leading-relaxed text-white/35">
          iOS only for now. Android is later. Unsubscribe anytime — reply to our invite email.
        </p>
      </div>
    </section>
  );
}
