"use client";

import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";

export default function NotificationListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 border-b border-white/[0.06] px-3 py-3 last:border-b-0"
        >
          <SkeletonCircle size={36} />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <SkeletonLine width="42%" height={13} />
            <SkeletonLine width="92%" height={12} />
            <SkeletonLine width={64} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
