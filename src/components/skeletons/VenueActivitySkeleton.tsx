"use client";

import { SkeletonLine } from "@/components/ui/Skeleton";

export default function VenueActivitySkeleton() {
  return (
    <div className="grid min-h-screen place-items-start bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+36px)] pt-[calc(env(safe-area-inset-top,0px)+16px)] text-white">
      <div className="mx-auto w-full max-w-md">
        <SkeletonLine width={72} height={36} className="mb-4 rounded-full" />
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <SkeletonLine width={120} height={12} className="mb-2 rounded-md opacity-80" />
          <SkeletonLine width="72%" height={28} className="mb-2 rounded-md" />
          <SkeletonLine width="100%" height={14} className="mb-4 max-w-sm rounded-md opacity-70" />
          <div className="mt-4 flex gap-2">
            <SkeletonLine width={88} height={32} className="rounded-full" />
            <SkeletonLine width={72} height={32} className="rounded-full" />
          </div>
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
            <SkeletonLine width="40%" height={16} className="mb-2 rounded-md" />
            <SkeletonLine width="100%" height={12} className="rounded-md opacity-70" />
            <SkeletonLine width="88%" height={12} className="mt-2 rounded-md opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}
