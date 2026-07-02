"use client";

import { useEffect, useRef, useState } from "react";
import { MARKETING_PREVIEW_ASSET_VERSION } from "@/lib/marketingContent";

const PREVIEWS = [
  {
    file: "app-map-overview.png",
    alt: "Intencity map zoomed out with live activity",
    width: 473,
    height: 1024,
    label: "Explore",
  },
  {
    file: "app-map-screenshot.png",
    alt: "Intencity map of Philadelphia with venue pins",
    width: 473,
    height: 1024,
    label: "Philadelphia",
  },
  {
    file: "app-map-street.png",
    alt: "Intencity street-level map with friends nearby",
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
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-[1.35rem] border border-white/[0.1] bg-black shadow-[0_16px_48px_rgba(0,0,0,0.45),0_0_0_1px_rgba(59,102,255,0.08)] ring-1 ring-white/[0.04] sm:rounded-[1.5rem] lg:rounded-[1.65rem]">
      {/* Native img — avoids Next image optimizer downscaling PNG screenshots. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className="block h-auto w-full [image-rendering:-webkit-optimize-contrast]"
      />
    </div>
  );
}

/** Three app screenshots — side-by-side on desktop, swipe carousel on mobile. */
export function MarketingAppPreview() {
  const [active, setActive] = useState(1);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-preview-index]"));
      if (!cards.length) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let closest = 0;
      let closestDist = Number.POSITIVE_INFINITY;
      cards.forEach((card) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - cardCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closest = Number(card.dataset.previewIndex);
        }
      });
      setActive(closest);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const shots = PREVIEWS.map((shot) => ({
    ...shot,
    src: `/marketing/${shot.file}?v=${MARKETING_PREVIEW_ASSET_VERSION}`,
  }));

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,22rem)] lg:max-w-none">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-violet/12 blur-3xl"
        aria-hidden
      />

      <div className="relative hidden sm:grid sm:grid-cols-3 sm:items-end sm:gap-2 md:gap-3 lg:gap-4">
        {shots.map((shot, index) => (
          <div key={shot.file} className="min-w-0">
            <PhoneFrame
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              priority={index === 1}
            />
            <p className="mt-2 text-center text-[10px] font-medium text-white/40 md:text-[11px]">
              {shot.label}
            </p>
          </div>
        ))}
      </div>

      <div className="sm:hidden">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shots.map((shot, index) => (
            <div
              key={shot.file}
              data-preview-index={index}
              className={`w-[min(78vw,280px)] shrink-0 snap-center transition ${active === index ? "opacity-100" : "opacity-80"}`}
            >
              <PhoneFrame
                src={shot.src}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                priority={index === 1}
              />
              <p className="mt-2 text-center text-xs font-medium text-white/45">{shot.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {shots.map((_, index) => (
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
