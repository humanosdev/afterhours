"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="block h-auto w-full"
        priority={priority}
        sizes="(max-width: 640px) 72vw, (max-width: 1024px) 28vw, 140px"
      />
    </div>
  );
}

/** Three app screenshots — side-by-side on desktop, swipe carousel on mobile. No overlap. */
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

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,22rem)] lg:max-w-none">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-violet/12 blur-3xl"
        aria-hidden
      />

      {/* Tablet/desktop: three equal columns — all fully visible */}
      <div className="relative hidden sm:grid sm:grid-cols-3 sm:items-end sm:gap-2 md:gap-3 lg:gap-4">
        {PREVIEWS.map((shot, index) => (
          <div key={shot.src} className="min-w-0">
            <PhoneFrame {...shot} priority={index === 1} />
            <p className="mt-2 text-center text-[10px] font-medium text-white/40 md:text-[11px]">
              {shot.label}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile: horizontal snap carousel */}
      <div className="sm:hidden">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PREVIEWS.map((shot, index) => (
            <div
              key={shot.src}
              data-preview-index={index}
              className={`w-[min(72vw,240px)] shrink-0 snap-center transition ${active === index ? "opacity-100" : "opacity-80"}`}
            >
              <PhoneFrame {...shot} priority={index === 1} />
              <p className="mt-2 text-center text-xs font-medium text-white/45">{shot.label}</p>
            </div>
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
