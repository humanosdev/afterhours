"use client";

import { SkeletonCircle, SkeletonLine, SkeletonCard } from "@/components/ui/Skeleton";

/** Matches hub: StoryRing storyLg (~78px outer), Avatar lg active row (56px), xs share header (28px), 240px media. */
export default function HubFeedSkeleton() {
  return (
    <div className="pointer-events-none select-none space-y-0" aria-hidden>
      {/* Moments strip — w-[84px] cols, storyLg + ring ≈ 78px diameter */}
      <section className="-mx-4 border-b border-white/[0.08] pb-3 pt-0 sm:-mx-5">
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

      <div className="my-4 h-px bg-white/[0.08]" />

      {/* Live Places header */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <SkeletonLine width={100} height={15} className="rounded-md" />
          <SkeletonLine width={96} height={28} className="rounded-full" />
        </div>
      </section>

      <div className="my-4 h-px bg-white/[0.08]" />

      {/* Friends shares */}
      <section className="space-y-3">
        <SkeletonLine width={130} height={15} className="rounded-md" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <SkeletonCircle size={28} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonLine width="55%" height={12} />
                <SkeletonLine width="35%" height={10} />
              </div>
            </div>
            <SkeletonCard className="aspect-[4/5] w-full rounded-none border-0" />
          </div>
        ))}
      </section>
    </div>
  );
}
