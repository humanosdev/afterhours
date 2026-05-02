"use client";

import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";

export default function LivePlacesListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-white/[0.06]">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="py-2.5 first:pt-0">
          <div className="flex w-full gap-3">
            <SkeletonLine width={56} height={56} className="shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1 space-y-2 py-0.5">
              <SkeletonLine width="72%" height={15} />
              <SkeletonLine width="88%" height={12} />
              <SkeletonLine width={110} height={10} />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 pr-0.5">
              <SkeletonLine width={22} height={18} />
              <SkeletonCircle size={8} className="opacity-40" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 pl-[68px]">
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((__, j) => (
                <SkeletonCircle key={j} size={22} />
              ))}
            </div>
            <SkeletonLine width={88} height={34} className="rounded-[10px]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
