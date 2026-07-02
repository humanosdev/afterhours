"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AuthIntencityWordmark } from "@/components/AuthIntencityWordmark";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { MapPin, Radio, Sparkles, UsersRound } from "lucide-react";

function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group flex gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3.5 shadow-[0_0_0_1px_rgba(59,102,255,0.06)] backdrop-blur-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.05] hover:shadow-[0_0_24px_rgba(59,102,255,0.12)]">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-primary/50 text-accent-violet shadow-[0_0_18px_rgba(59,102,255,0.18)]">
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[15px] font-semibold tracking-tight text-white">{title}</p>
        <p className="mt-1 text-[13px] leading-snug text-text-secondary">{body}</p>
      </div>
    </div>
  );
}

/** Era 2 marketing homepage — no login; app download CTAs only. */
export function MarketingHomeLanding() {
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-0 h-72 w-[min(140%,28rem)] -translate-x-1/2 -translate-y-1/4"
          aria-hidden
        >
          <div className="ah-landing-float-slow h-full w-full rounded-full bg-accent-violet/16 blur-[72px]" />
        </div>
        <div
          className="pointer-events-none absolute -right-24 top-32 z-0 h-48 w-48 rounded-full bg-accent-violet/8 blur-[64px]"
          aria-hidden
        />

        <div className="relative z-[1] mx-auto max-w-3xl text-center">
          <AuthIntencityWordmark className="mx-auto mb-4 shrink-0" />
          <h1 className="sr-only">Intencity — live nightlife awareness</h1>

          <p className="ah-landing-hero-animate mx-auto max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg [animation-delay:80ms]">
            See where people are, what&apos;s active, and where your friends are moving — live.
          </p>

          <p className="ah-landing-hero-animate mx-auto mt-4 max-w-md text-sm text-white/45 [animation-delay:140ms]">
            Intencity is available on iOS and Android. Sign in and use the app — not the web.
          </p>
        </div>

        <div
          id="download"
          className="ah-landing-hero-animate relative z-[1] mx-auto mt-10 max-w-md scroll-mt-24 sm:mt-12 [animation-delay:200ms]"
        >
          <AppStoreButtons size="large" />
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.02] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet-active/80">
            Why Intencity
          </h2>
          <div className="mt-8 space-y-2.5 sm:space-y-3">
            <FeatureRow
              icon={<Sparkles size={18} strokeWidth={1.75} className="text-accent-violet-active" />}
              title="Know the vibe before you go"
              body="Scan energy, crowds, and motion before you step out."
            />
            <FeatureRow
              icon={<UsersRound size={18} strokeWidth={1.75} className="text-accent-violet-active" />}
              title="See where your friends are"
              body="Stay close to the crew when the night shifts."
            />
            <FeatureRow
              icon={<Radio size={18} strokeWidth={1.75} className="text-accent-violet-active" />}
              title="Discover what's happening live"
              body="Moments, venues, and the map — one pulse."
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-2 flex justify-center text-accent-violet/80">
            <MapPin size={22} strokeWidth={1.75} aria-hidden />
          </div>
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Your city is already moving.
          </p>
          <p className="mt-2 text-base text-white/55">Download Intencity and join the pulse.</p>
          <div className="mx-auto mt-8 max-w-md">
            <AppStoreButtons size="large" />
          </div>
          <p className="mt-8 text-xs leading-relaxed text-white/40">
            By using Intencity you agree to our{" "}
            <Link href="/terms" className="text-white/65 underline underline-offset-2 hover:text-white/85">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-white/65 underline underline-offset-2 hover:text-white/85">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
