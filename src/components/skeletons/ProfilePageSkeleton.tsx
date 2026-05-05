"use client";

import { SkeletonCircle, SkeletonGrid, SkeletonLine } from "@/components/ui/Skeleton";

export default function ProfilePageSkeleton() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-black text-white">
      <div className="mx-auto flex w-full max-w-[min(100%,28rem)] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:max-w-[30rem] sm:px-5 sm:pt-3 lg:max-w-[32rem]">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine width={88} height={18} />
            <SkeletonLine width={140} height={14} />
          </div>
          <SkeletonLine width={36} height={36} className="rounded-full" />
        </div>

        <div className="mt-6 flex flex-col items-center">
          <SkeletonCircle size={112} />
          <SkeletonLine width={160} height={18} className="mt-4" />
          <SkeletonLine width={200} height={13} className="mt-2" />
          <SkeletonLine width="72%" height={12} className="mt-3 max-w-sm" />
          <SkeletonLine width="58%" height={12} className="mt-2 max-w-sm" />
        </div>

        <div className="mx-auto mt-6 grid w-full max-w-xs grid-cols-3 gap-3 border-y border-white/[0.08] py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <SkeletonLine width={32} height={18} className="mx-auto" />
              <SkeletonLine width={48} height={10} className="mx-auto" />
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2 border-b border-white/[0.08] pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLine key={i} width={72} height={28} className="rounded-full" />
          ))}
        </div>

        <div className="mt-4">
          <SkeletonGrid columns={3} count={9} gapClass="gap-1" cellClass="aspect-square rounded-lg" />
        </div>
      </div>
    </div>
  );
}
