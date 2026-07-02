"use client";

import type { ReactNode } from "react";
import { appConfig } from "@/lib/appConfig";
import { Apple, Mail, Play } from "lucide-react";

type AppStoreButtonsProps = {
  /** Larger buttons for hero sections */
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
  const androidUrl = appConfig.androidPlayStoreUrl.trim();
  const storesLive = Boolean(iosUrl || androidUrl);

  return (
    <div className={className}>
      <div className={`grid gap-3 ${size === "large" ? "sm:grid-cols-2" : ""}`}>
        <StoreButton
          href={iosUrl}
          disabled={!iosUrl}
          size={size}
          icon={<Apple size={20} strokeWidth={1.75} aria-hidden />}
          sublabel={iosUrl ? "Download on the" : "Coming soon to the"}
          label="App Store"
        />
        <StoreButton
          href={androidUrl}
          disabled={!androidUrl}
          size={size}
          icon={<Play size={20} strokeWidth={1.75} className="ml-0.5" aria-hidden />}
          sublabel={androidUrl ? "Get it on" : "Coming soon on"}
          label="Google Play"
        />
      </div>
      {!storesLive ? (
        <a
          href={`mailto:${appConfig.contactEmail}?subject=${encodeURIComponent("Intencity app launch")}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-sm font-medium text-white/70 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
        >
          <Mail size={16} strokeWidth={1.75} aria-hidden />
          Get notified at launch
        </a>
      ) : null}
    </div>
  );
}
