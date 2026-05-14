"use client";

import { SkeletonLine } from "@/components/ui/Skeleton";

export default function LivePlacesListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <div className="flex w-full gap-3">
            <SkeletonLine width={72} height={72} className="shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
              <SkeletonLine width="78%" height={16} />
              <SkeletonLine width="62%" height={12} />
              <div className="flex gap-2 rounded-xl bg-black/20 py-3">
                <div className="flex-1 space-y-2 px-2 text-center">
                  <SkeletonLine width={40} height={9} className="mx-auto" />
                  <SkeletonLine width={28} height={22} className="mx-auto" />
                  <SkeletonLine width={72} height={10} className="mx-auto" />
                </div>
                <div className="flex-1 space-y-2 px-2 text-center">
                  <SkeletonLine width={44} height={9} className="mx-auto" />
                  <SkeletonLine width={28} height={22} className="mx-auto" />
                  <SkeletonLine width={72} height={10} className="mx-auto" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2 border-t border-white/[0.05] pt-3">
            <SkeletonLine height={40} className="flex-1 rounded-xl" />
            <SkeletonLine height={40} className="flex-1 rounded-xl" />
          </div>
        </li>
      ))}
    </ul>
  );
}
