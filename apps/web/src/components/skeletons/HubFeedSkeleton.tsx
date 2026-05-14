"use client";

import { Skeleton, SkeletonCircle, SkeletonLine, SkeletonCard } from "@/components/ui/Skeleton";

/**
 * Moments + Active friends skeleton strips only — same layout as hub horizontal swipers.
 * Shown briefly after `feedReady` until real rings/avatars mount (see hub page).
 */
export function HubUpperSkeletonStrips() {
  return (
    <>
      {/* Moments strip — w-[84px] cols, storyLg + ring ≈ 78px diameter */}
      <section className="-mx-4 pb-3 pt-0 sm:-mx-5">
        <div className="scrollbar-none flex items-start gap-[14px] overflow-hidden px-4 pb-1 sm:px-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-[84px] shrink-0 flex-col items-center">
              <SkeletonCircle size={78} />
              <SkeletonLine width={56} height={10} className="mt-2.5" />
            </div>
          ))}
        </div>
      </section>

      {/* Active friends — Avatar size="lg" = 56px */}
      <section className="space-y-2.5 pt-4">
        <div className="flex items-center justify-between gap-2">
          <SkeletonLine width={120} height={15} className="rounded-md" />
          <SkeletonLine width={88} height={28} className="rounded-full" />
        </div>
        <div className="scrollbar-none -mx-0.5 flex gap-4 overflow-hidden px-0.5 pb-0.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
              <SkeletonCircle size={56} />
              <SkeletonLine width={52} height={10} />
              <SkeletonLine width={44} height={8} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * Live Places header + horizontal venue-card strip — matches hub `Live Places` layout
 * (`w-[min(72vw,15.5rem)]` cards, 5/6 hero) so the strip does not paint before Moments mount.
 */
export function HubLivePlacesSkeletonSection() {
  return (
    <section className="pointer-events-none select-none pt-6 sm:pt-8" aria-hidden>
      <div className="mb-2 flex items-center justify-between gap-2">
        <SkeletonLine width={100} height={15} className="rounded-md" />
        <SkeletonLine width={96} height={28} className="rounded-full" />
      </div>
      <div className="relative -mx-4 sm:-mx-5">
        <div className="scrollbar-none flex gap-3 overflow-hidden px-4 pb-2 sm:px-5 sm:pb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="ah-glass-control w-[min(72vw,15.5rem)] shrink-0 overflow-hidden rounded-2xl shadow-[0_0_24px_rgba(59,102,255,0.06),0_14px_40px_rgba(0,0,0,0.45)]"
            >
              <Skeleton className="aspect-[5/6] w-full rounded-none border-0" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Matches hub: StoryRing storyLg (~78px outer), Avatar lg active row (56px), xs share header (28px), 240px media. */
export default function HubFeedSkeleton() {
  return (
    <div className="pointer-events-none select-none space-y-0" aria-hidden>
      <HubUpperSkeletonStrips />

      <div className="mt-14 mb-5 h-px bg-white/[0.08]" aria-hidden />

      <HubLivePlacesSkeletonSection />

      <div className="mt-8 mb-4 h-px bg-white/[0.08]" />

      {/* Shares feed */}
      <section className="space-y-3">
        <SkeletonLine width={72} height={15} className="rounded-md" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="w-full pb-10">
            <div className="flex items-center gap-2.5 px-0.5 pb-2.5 pt-0.5">
              <SkeletonCircle size={36} />
              <SkeletonLine width={110} height={14} className="rounded-md" />
            </div>
            <SkeletonCard className="aspect-[4/5] w-full rounded-[2px] border-0" />
            <div className="mt-3 flex gap-5 px-0.5">
              <SkeletonLine width={28} height={26} className="rounded-md" />
              <SkeletonLine width={40} height={26} className="rounded-md" />
            </div>
            <SkeletonLine width={72} height={13} className="mt-2 rounded-md px-0.5" />
            <SkeletonLine width={96} height={12} className="mt-2 rounded-md px-0.5" />
          </div>
        ))}
      </section>
    </div>
  );
}
