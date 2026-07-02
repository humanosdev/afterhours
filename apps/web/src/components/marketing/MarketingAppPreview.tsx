"use client";

import Image from "next/image";
import { useState } from "react";

const PREVIEWS = [
  {
    src: "/marketing/app-map-overview.png",
    alt: "Intencity map zoomed out with category filters",
    width: 473,
    height: 1024,
    label: "Explore",
  },
  {
    src: "/marketing/app-map-screenshot.png",
    alt: "Intencity map at venue level with friend pins",
    width: 514,
    height: 1024,
    label: "Venues",
  },
  {
    src: "/marketing/app-map-street.png",
    alt: "Intencity street-level map with your location",
    width: 473,
    height: 1024,
    label: "Nearby",
  },
] as const;

function PhoneFrame({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-black shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,102,255,0.08)] ring-1 ring-white/[0.04] ${className}`.trim()}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-auto w-full"
        priority={priority}
        sizes="(max-width: 640px) 240px, 220px"
      />
    </div>
  );
}

/** Three real app screenshots — fan on desktop, swipe carousel on mobile. */
export function MarketingAppPreview() {
  const [active, setActive] = useState(1);

  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-violet/15 blur-3xl"
        aria-hidden
      />

      {/* Desktop: three-phone fan */}
      <div className="relative hidden h-[420px] items-end justify-center sm:flex lg:h-[460px]">
        <div className="absolute bottom-0 w-[200px] -translate-x-[118%] rotate-[-8deg] opacity-85 lg:w-[220px]">
          <PhoneFrame {...PREVIEWS[0]} />
        </div>
        <div className="relative z-10 w-[220px] lg:w-[240px]">
          <PhoneFrame {...PREVIEWS[1]} priority />
        </div>
        <div className="absolute bottom-0 w-[200px] translate-x-[18%] rotate-[8deg] opacity-85 lg:w-[220px]">
          <PhoneFrame {...PREVIEWS[2]} />
        </div>
      </div>

      {/* Mobile: snap carousel */}
      <div className="sm:hidden">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PREVIEWS.map((shot, index) => (
            <button
              key={shot.src}
              type="button"
              onClick={() => setActive(index)}
              className={`w-[min(72vw,260px)] shrink-0 snap-center text-left transition ${active === index ? "scale-100 opacity-100" : "scale-[0.96] opacity-70"}`}
              aria-label={`Show ${shot.label} preview`}
            >
              <PhoneFrame {...shot} priority={index === 1} />
              <p className="mt-2 text-center text-xs font-medium text-white/45">{shot.label}</p>
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {PREVIEWS.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all ${active === index ? "w-5 bg-accent-violet-active" : "w-1.5 bg-white/20"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
