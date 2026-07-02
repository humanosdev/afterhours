"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { IntencityBrandLockupImage } from "@/components/IntencityBrandLockupImage";
import {
  MessageCircle,
  Radio,
  Shield,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-5 shadow-[0_0_0_1px_rgba(59,102,255,0.06)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_16px_48px_rgba(59,102,255,0.12)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent-violet/10 blur-2xl transition group-hover:bg-accent-violet/20" />
      <div className="relative grid h-11 w-11 place-items-center rounded-xl border border-white/[0.1] bg-primary/70 text-accent-violet-active shadow-[0_0_20px_rgba(59,102,255,0.2)]">
        {icon}
      </div>
      <h3 className="relative mt-4 text-[17px] font-semibold tracking-tight text-white">{title}</h3>
      <p className="relative mt-2 text-[14px] leading-relaxed text-white/55">{body}</p>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-violet/30 bg-accent-violet/10 text-sm font-bold text-accent-violet-active">
        {number}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-white/50">{body}</p>
      </div>
    </div>
  );
}

/** Phase 6 marketing homepage — download-first, no web product. */
export function MarketingHomeLanding() {
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-20">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="ah-landing-float-slow absolute left-1/2 top-0 h-[28rem] w-[min(120%,36rem)] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent-violet/20 blur-[100px]" />
          <div className="absolute -left-32 top-40 h-56 w-56 rounded-full bg-accent-violet/10 blur-[80px]" />
          <div className="absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-[72px]" />
        </div>

        <div className="relative z-[1] mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="text-center lg:text-left">
            <div className="ah-landing-hero-animate mx-auto lg:mx-0">
              <IntencityBrandLockupImage variant="auth" className="mx-auto h-[2.5rem] w-auto lg:mx-0" />
            </div>
            <h1 className="ah-landing-headline-glow mt-8 text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.05] tracking-tight text-white [animation-delay:60ms]">
              Feel where the night is alive.
            </h1>
            <p className="ah-landing-hero-animate mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg lg:mx-0 [animation-delay:120ms]">
              Intencity shows live venue energy, friend movement, and the pulse of your city — in one
              native app built for going out.
            </p>
            <p className="ah-landing-hero-animate mt-4 text-sm text-white/40 [animation-delay:180ms]">
              The web is for info only. Sign in, map, chat, and post from the iOS or Android app.
            </p>
            <div
              id="download"
              className="ah-landing-hero-animate mx-auto mt-10 max-w-md scroll-mt-28 lg:mx-0 [animation-delay:240ms]"
            >
              <AppStoreButtons size="large" />
            </div>
          </div>

          <div className="ah-landing-hero-animate relative mx-auto w-full max-w-[320px] [animation-delay:200ms] sm:max-w-[360px] lg:max-w-none">
            <div className="ah-landing-preview-pulse relative mx-auto aspect-[9/19] w-full max-w-[320px] overflow-hidden rounded-[2.25rem] border border-white/[0.12] bg-gradient-to-b from-[#12162a] to-[#0a0c18] p-3 shadow-[0_32px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(59,102,255,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-black/80" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-white/[0.06] bg-primary">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <Image src="/hub-logo.png" alt="" width={88} height={24} className="h-5 w-auto opacity-90" />
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                    <span className="h-2 w-2 rounded-full bg-accent-violet-active/80" />
                  </div>
                </div>
                <div className="flex-1 space-y-3 p-3">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-violet-active/90">
                      Live now
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">3 friends at The Standard</p>
                    <p className="mt-1 text-xs text-white/45">Heat rising · 12 nearby</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="aspect-[3/4] rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-white/[0.02]"
                      />
                    ))}
                  </div>
                  <div className="rounded-2xl border border-accent-violet/20 bg-accent-violet/10 px-3 py-2.5">
                    <p className="text-xs font-medium text-white/80">Map · venues lighting up</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.02] px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-6 text-center sm:grid-cols-3">
          {[
            { label: "Live venue heat", value: "Real-time" },
            { label: "Friend awareness", value: "Foreground" },
            { label: "Moments & shares", value: "Native" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-lg font-semibold text-white sm:text-xl">{stat.value}</p>
              <p className="mt-1 text-sm text-white/45">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-accent-violet-active/85">
            Built for the night
          </p>
          <h2 className="mt-3 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Everything you need before you step out
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <FeatureCard
              icon={<Sparkles size={20} strokeWidth={1.75} />}
              title="Venue heat you can trust"
              body="See where energy is building — not stale lists or guesswork."
            />
            <FeatureCard
              icon={<UsersRound size={20} strokeWidth={1.75} />}
              title="Friends on the map"
              body="Know when your crew arrives, moves, or checks in — with honest presence."
            />
            <FeatureCard
              icon={<Radio size={20} strokeWidth={1.75} />}
              title="Moments that expire"
              body="Story rings and shares built for tonight, not forever clutter."
            />
            <FeatureCard
              icon={<MessageCircle size={20} strokeWidth={1.75} />}
              title="DMs that keep up"
              body="Chat with the people you're actually going out with — fast, native, realtime."
            />
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet-active/80">
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Open. See. Go.</h2>
            <div className="mt-8 space-y-6">
              <Step
                number="1"
                title="Download Intencity"
                body="Get the native app — that's where sign-in and your account live."
              />
              <Step
                number="2"
                title="Allow location when you're out"
                body="Foreground presence keeps heat and friend awareness honest — you control ghost mode."
              />
              <Step
                number="3"
                title="Follow the pulse"
                body="Map, hub, chat, and moments update together as the night moves."
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <Shield size={22} className="mt-0.5 shrink-0 text-accent-violet-active" strokeWidth={1.75} />
              <div>
                <p className="text-[15px] font-semibold text-white">Privacy by design</p>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Ghost mode, clear venue semantics, and no creepy 24/7 dot tracking. We show presence
                  when it helps you go out — not when it doesn&apos;t.
                </p>
                <Link
                  href="/privacy"
                  className="mt-4 inline-flex text-sm font-medium text-accent-violet-active transition hover:text-accent-violet"
                >
                  Read our Privacy Policy →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Zap size={24} className="mx-auto text-accent-violet-active" strokeWidth={1.75} aria-hidden />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Your city is already moving.
          </h2>
          <p className="mt-3 text-base text-white/55">Join on iOS or Android — the night doesn&apos;t wait.</p>
          <div className="mx-auto mt-8 max-w-md">
            <AppStoreButtons size="large" />
          </div>
          <p className="mt-8 text-xs leading-relaxed text-white/35">
            By downloading Intencity you agree to our{" "}
            <Link href="/terms" className="text-white/60 underline underline-offset-2 hover:text-white/85">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy" className="text-white/60 underline underline-offset-2 hover:text-white/85">
              Privacy Policy
            </Link>
            , and{" "}
            <Link href="/guidelines" className="text-white/60 underline underline-offset-2 hover:text-white/85">
              Community Guidelines
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
