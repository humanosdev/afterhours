"use client";

import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/** Matches moments/[id] header row + 56vh media + actions / comment stack. */
export default function MomentDetailSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <SkeletonLine width={72} height={16} className="rounded-md" />
        <SkeletonLine width={168} height={14} className="rounded-md" />
        <div className="w-12 shrink-0" aria-hidden />
      </div>
      <div className="p-3">
        <SkeletonCard className="h-[56vh] w-full rounded-2xl border border-white/[0.06]" />
      </div>
      <div className="space-y-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        <SkeletonLine width={88} height={18} className="rounded-md" />
        <SkeletonLine width="100%" height={112} className="rounded-xl" />
        <div className="flex items-center gap-2">
          <SkeletonLine width="100%" height={36} className="flex-1 rounded-lg" />
          <SkeletonLine width={56} height={36} className="shrink-0 rounded-lg" />
        </div>
      </div>
    </>
  );
}
