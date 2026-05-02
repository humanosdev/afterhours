"use client";

import { SkeletonLine } from "@/components/ui/Skeleton";

/** Full-viewport black shell while map bundle / style initializes — no white flash. */
export default function MapPageSkeleton() {
  return (
    <div className="relative h-[100dvh] w-screen bg-black">
      <div className="absolute inset-0 bg-black" />
      <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+30px)] z-20 flex w-[min(94vw,420px)] -translate-x-1/2 flex-col gap-2">
        <div className="rounded-2xl border border-white/[0.07] bg-black/80 p-2 backdrop-blur-xl">
          <div className="flex gap-1.5 overflow-hidden pb-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} width={52} height={28} className="shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] z-10 flex justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-black/75 p-4 backdrop-blur-md">
          <SkeletonLine width="40%" height={14} className="mb-3" />
          <SkeletonLine width="100%" height={44} className="rounded-xl" />
          <div className="mt-3 space-y-2">
            <SkeletonLine width="100%" height={52} className="rounded-xl" />
            <SkeletonLine width="100%" height={52} className="rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
