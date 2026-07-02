"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { MarketingAppPreview } from "@/components/marketing/MarketingAppPreview";
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

/** Marketing homepage — one message per section, real app preview. */
export function MarketingHomeLanding() {
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-accent-violet/12 blur-[90px]" />
          <div className="absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-[72px]" />
        </div>

        <div className="relative z-[1] mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="text-center lg:text-left">
            <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.08] tracking-tight text-white">
              Feel where the night is alive.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg lg:mx-0">
              Live venue heat, friends on the map, and tonight&apos;s moments — built for going out, not
              scrolling at home.
            </p>
            <div id="download" className="mx-auto mt-9 max-w-md scroll-mt-24 lg:mx-0">
              <AppStoreButtons size="large" />
            </div>
          </div>

          <MarketingAppPreview />
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-t border-white/[0.06] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Built for the night
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={<Sparkles size={20} strokeWidth={1.75} />}
              title="Venue heat you can trust"
              body="Filters, live pins, and activity that reflect what's actually happening — not yesterday's listicles."
            />
            <FeatureCard
              icon={<UsersRound size={20} strokeWidth={1.75} />}
              title="Friends on the map"
              body="See who's nearby and where your crew landed. Ghost mode when you want to stay off the grid."
            />
            <FeatureCard
              icon={<Radio size={20} strokeWidth={1.75} />}
              title="Moments that expire"
              body="Story rings and shares meant for tonight — not another permanent feed."
            />
            <FeatureCard
              icon={<MessageCircle size={20} strokeWidth={1.75} />}
              title="DMs in real time"
              body="Coordinate plans with the people you're actually out with."
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
                body="Venues light up by category — nightlife, food, campus, and more."
              />
              <Step
                number="2"
                title="Find your people"
                body="Friend pins and venue cards update as everyone moves through the night."
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
                  helps you go out, not around the clock.
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
