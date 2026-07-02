"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AuthIntencityWordmark } from "@/components/AuthIntencityWordmark";
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

export function HomeLanding() {
  return (
    <AuthScreenShell marketing marketingScroll className="transition-colors">
      <div className="relative">
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-0 h-40 w-[min(120%,22rem)] -translate-x-1/2 -translate-y-1/3"
          aria-hidden
        >
          <div className="ah-landing-float-slow h-full w-full rounded-full bg-accent-violet/14 blur-[56px]" />
        </div>

        <div className="relative z-[1]">
          <AuthIntencityWordmark className="mb-2 shrink-0" />
          <h1 className="sr-only">Intencity</h1>

          <p className="ah-landing-hero-animate mx-auto max-w-[22rem] text-center text-sm leading-relaxed text-text-secondary [animation-delay:120ms]">
            See where people are, what&apos;s active, and where your friends are moving — live.
          </p>

          <div className="ah-landing-hero-animate mx-auto mt-6 max-w-[min(92vw,28rem)] space-y-2.5 sm:mt-10 sm:max-w-xl sm:space-y-3 [animation-delay:180ms]">
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
              title="Discover what&apos;s happening live"
              body="Moments, venues, and the map — one pulse."
            />
          </div>

          <div className="mx-auto mt-8 max-w-[20rem] text-center sm:mt-14">
            <div className="mx-auto mb-1 flex justify-center text-accent-violet/80">
              <MapPin size={20} strokeWidth={1.75} aria-hidden />
            </div>
            <p className="text-[17px] font-semibold tracking-tight text-white">Your city is already moving.</p>
            <p className="mt-1.5 text-[15px] font-medium text-white/55">Join Intencity.</p>
          </div>

          <div className="mx-auto mt-6 w-full max-w-sm space-y-3 pb-2 sm:mt-8">
            <Link
              href="/signup"
              className="flex w-full items-center justify-center rounded-xl bg-white py-3 text-center text-[15px] font-semibold text-black shadow-[0_1px_0_rgba(255,255,255,0.12)] transition duration-200 ease-out hover:bg-white/95 active:scale-[0.99]"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 py-3 text-center text-[15px] font-semibold text-white transition duration-200 ease-out hover:border-white/[0.14] hover:bg-white/[0.08] active:scale-[0.99]"
            >
              Log in
            </Link>
          </div>

          <p className="mx-auto mt-6 max-w-sm pb-2 text-center text-xs leading-relaxed text-white/50 sm:mt-8">
            By joining, you agree to our{" "}
            <Link href="/terms" className="text-white/80 underline underline-offset-2">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-white/80 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </AuthScreenShell>
  );
}
