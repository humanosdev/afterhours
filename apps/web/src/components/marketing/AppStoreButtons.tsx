"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { appConfig } from "@/lib/appConfig";
import { MARKETING_LAUNCH_CITY_LABEL } from "@/lib/marketingContent";
import { Apple } from "lucide-react";

type AppStoreButtonsProps = {
  size?: "default" | "large";
  className?: string;
};

function StoreButton({
  href,
  icon,
  label,
  sublabel,
  size,
  disabled,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  sublabel: string;
  size: "default" | "large";
  disabled?: boolean;
}) {
  const base =
    "group flex w-full items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 shadow-[0_0_0_1px_rgba(59,102,255,0.05)] backdrop-blur-sm transition duration-200 ease-out";
  const interactive = disabled
    ? "cursor-default opacity-75"
    : "hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.07] hover:shadow-[0_8px_32px_rgba(59,102,255,0.14)] active:scale-[0.99]";
  const pad = size === "large" ? "py-3.5" : "py-3";

  const inner = (
    <>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-primary/60 text-white">
        {icon}
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">{sublabel}</p>
        <p className="text-[15px] font-semibold tracking-tight text-white">{label}</p>
      </div>
    </>
  );

  if (disabled || !href) {
    return (
      <div className={`${base} ${pad} ${interactive}`} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${pad} ${interactive}`}
    >
      {inner}
    </a>
  );
}

export function AppStoreButtons({ size = "default", className = "" }: AppStoreButtonsProps) {
  const iosUrl = appConfig.iosAppStoreUrl.trim();
  const storesLive = Boolean(iosUrl);

  return (
    <div className={className}>
      <StoreButton
        href={iosUrl}
        disabled={!iosUrl}
        size={size}
        icon={<Apple size={20} strokeWidth={1.75} aria-hidden />}
        sublabel={iosUrl ? "Download on the" : "Coming soon to the"}
        label="App Store"
      />
      {!storesLive ? (
        <Link
          href="#waitlist"
          className="mt-4 flex w-full items-center justify-center rounded-full bg-accent-violet px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,102,255,0.2)] transition hover:bg-accent-violet-active"
        >
          Join the waitlist
        </Link>
      ) : null}
      {!storesLive ? (
        <p className="mt-3 text-center text-xs leading-relaxed text-white/40">
          Launching in {MARKETING_LAUNCH_CITY_LABEL} · iOS TestFlight first
        </p>
      ) : null}
    </div>
  );
}
