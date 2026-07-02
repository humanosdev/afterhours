"use client";

import Link from "next/link";
import { appConfig } from "@/lib/appConfig";
import { MARKETING_LAUNCH_CITY_LABEL } from "@/lib/marketingContent";
import { Apple } from "lucide-react";

type AppStoreButtonsProps = {
  size?: "default" | "large";
  className?: string;
};

export function AppStoreButtons({ size = "default", className = "" }: AppStoreButtonsProps) {
  const iosUrl = appConfig.iosAppStoreUrl.trim();
  const storesLive = Boolean(iosUrl);
  const pad = size === "large" ? "py-3.5" : "py-3";

  const rowClass = `flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 shadow-[0_0_0_1px_rgba(59,102,255,0.05)] backdrop-blur-sm ${pad}`;

  const label = (
    <>
      <Apple size={20} strokeWidth={1.75} aria-hidden className="text-white" />
      <span className="text-[15px] font-semibold tracking-tight text-white">iOS</span>
    </>
  );

  return (
    <div className={className}>
      {storesLive ? (
        <a
          href={iosUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${rowClass} transition hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.07] active:scale-[0.99]`}
        >
          {label}
        </a>
      ) : (
        <div className={`${rowClass} opacity-90`} aria-label="iOS app coming soon">
          {label}
        </div>
      )}

      {!storesLive ? (
        <Link
          href="#waitlist"
          className="mt-4 flex w-full items-center justify-center rounded-full bg-accent-violet px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,102,255,0.2)] transition hover:bg-accent-violet-active"
        >
          Join the waitlist
        </Link>
      ) : null}

      {!storesLive ? (
        <p className="mt-3 text-center text-xs text-white/40">Available in {MARKETING_LAUNCH_CITY_LABEL}</p>
      ) : null}
    </div>
  );
}
