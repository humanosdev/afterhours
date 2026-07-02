"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { MarketingAppPreview } from "@/components/marketing/MarketingAppPreview";
import { MarketingWaitlistSection } from "@/components/marketing/MarketingWaitlistSection";
import { MARKETING_LAUNCH_CITY_LABEL } from "@/lib/marketingContent";
import { MessageCircle, Radio, Shield, Sparkles, UsersRound } from "lucide-react";

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
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.1] bg-primary/60 text-accent-violet-active">
        {icon}
      </div>
      <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-white/55">{body}</p>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
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

/** Marketing homepage — Philadelphia launch, day + night. */
export function MarketingHomeLanding() {
  return (
    <>
      <section className="relative overflow-x-clip px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-accent-violet/12 blur-[90px]" />
          <div className="absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-[72px]" />
        </div>

        <div className="relative z-[1] mx-auto grid min-w-0 max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
          <div className="min-w-0 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-violet-active/85">
              Now in {MARKETING_LAUNCH_CITY_LABEL}
            </p>
            <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.08] tracking-tight text-white">
              Feel what&apos;s alive in your city.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg lg:mx-0">
              Brunch spots, campus hangs, nightlife, and everything in between — live venue activity,
              friends on the map, and moments from the people you actually go out with.
            </p>
            <div id="download" className="mx-auto mt-9 max-w-md scroll-mt-24 lg:mx-0">
              <AppStoreButtons size="large" />
            </div>
          </div>

          <div className="min-w-0">
            <MarketingAppPreview />
          </div>
        </div>
      </section>

      <MarketingWaitlistSection />

      <section id="features" className="scroll-mt-24 border-t border-white/[0.06] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Built for your whole day
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={<Sparkles size={20} strokeWidth={1.75} />}
              title="Live activity you can trust"
              body="Food, campus, events, nightlife — filters and pins that reflect what's happening now."
            />
            <FeatureCard
              icon={<UsersRound size={20} strokeWidth={1.75} />}
              title="Friends on the map"
              body="See who's nearby and where your crew landed. Ghost mode when you want to stay off the grid."
            />
            <FeatureCard
              icon={<Radio size={20} strokeWidth={1.75} />}
              title="Moments that expire"
              body="Story rings and shares for the day you're in — not another permanent feed."
            />
            <FeatureCard
              icon={<MessageCircle size={20} strokeWidth={1.75} />}
              title="DMs in real time"
              body="Coordinate plans with the people you're actually meeting up with."
            />
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">How it works</h2>
            <div className="mt-8 space-y-6">
              <Step
                number="1"
                title="Open the map"
                body="Venues light up by category — food, campus, events, nightlife, and more."
              />
              <Step
                number="2"
                title="Find your people"
                body="Friend pins and venue cards update as everyone moves through the day."
              />
              <Step
                number="3"
                title="Share the moment"
                body="Post from the + tab; hub and chat stay in sync while you're out."
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <Shield size={22} className="mt-0.5 shrink-0 text-accent-violet-active" strokeWidth={1.75} />
              <div>
                <p className="text-[15px] font-semibold text-white">Privacy by design</p>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Ghost mode, clear venue semantics, and foreground presence — we show location when it
                  helps you meet up, not around the clock.
                </p>
                <Link
                  href="/privacy"
                  className="mt-4 inline-flex text-sm font-medium text-accent-violet-active transition hover:text-accent-violet"
                >
                  Privacy Policy →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
